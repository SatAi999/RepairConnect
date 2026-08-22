import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { RepairKnowledge } from '../models/RepairKnowledge';
import { IAIDiagnosis } from '../models/AIDiagnosis';
import { IRepairEstimate } from '../models/RepairEstimate';

// Define expected return structures
export interface AIDiagnosisResult {
  itemCategory: string;
  identifiedItem: string;
  visibleDamage: string[];
  possibleCauses: Array<{ cause: string; confidence: number }>;
  confidence: number;
  troubleshootingSteps: string[];
  safetyWarnings: string[];
  limitations: string[];
}

export interface RepairAssessmentResult {
  estimatedMin: number;
  estimatedMax: number;
  replacementMin: number;
  replacementMax: number;
  currency: string;
  repairabilityScore: number;
  recommendation: 'repair_recommended' | 'worthwhile' | 'replace_recommended' | 'professional_needed';
  reasoning: string;
}

export class AIService {
  private static getApiKey(): string | undefined {
    return process.env.AI_API_KEY;
  }

  private static isDemoMode(): boolean {
    return process.env.DEMO_MODE === 'true' || !this.getApiKey();
  }

  /**
   * Helper to convert local file to Gemini generative part
   */
  private static fileToGenerativePart(filePath: string, mimeType: string) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
        mimeType,
      },
    };
  }

  /**
   * Identifies the item category based on input
   */
  public static async identifyItem(description: string): Promise<string> {
    const desc = description.toLowerCase();
    if (desc.includes('laptop') || desc.includes('macbook') || desc.includes('computer')) return 'Laptop';
    if (desc.includes('phone') || desc.includes('iphone') || desc.includes('mobile') || desc.includes('screen')) return 'Smartphone';
    if (desc.includes('cycle') || desc.includes('bike')) return 'Bicycle';
    if (desc.includes('fridge') || desc.includes('refrigerator')) return 'Refrigerator';
    if (desc.includes('wash') || desc.includes('dryer')) return 'Washing machine';
    if (desc.includes('chair') || desc.includes('table') || desc.includes('desk') || desc.includes('sofa')) return 'Furniture';
    return 'Electronics'; // Default fallback
  }

  /**
   * Performs the primary damage analysis
   */
  public static async analyzeDamage(
    description: string,
    mediaPath?: string
  ): Promise<AIDiagnosisResult> {
    const category = await this.identifyItem(description);
    
    // 1. Check if running in DEMO_MODE or without API Key
    if (this.isDemoMode()) {
      console.log('[AIService] Running in DEMO/MOCK mode.');
      return this.getMockDiagnosis(category, description);
    }

    // 2. Production mode with Gemini API
    try {
      const apiKey = this.getApiKey();
      // Initialize Google Generative AI
      const genAI = new GoogleGenerativeAI(apiKey!);
      const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Load knowledge reference to inject into system prompt
      const knowledge = await RepairKnowledge.findOne({ category });
      const servicesContext = knowledge 
        ? `Use this reference context for repair estimates and services: ${JSON.stringify(knowledge.services)}` 
        : 'Analyze screen issues, charging faults, hardware failures, or physical damage based on common standards.';

      const systemPrompt = `
        You are a highly precise repair expert AI. Analyze the user's issue and image.
        Format your response EXACTLY as a JSON object with this schema:
        {
          "itemCategory": "${category}",
          "identifiedItem": "Specific model name or standard item description",
          "visibleDamage": ["list", "of", "detected", "physical", "issues"],
          "possibleCauses": [
            { "cause": "Cause explanation", "confidence": 0.85 }
          ],
          "confidence": 0.85,
          "troubleshootingSteps": ["Safe, simple, basic troubleshooting steps only"],
          "safetyWarnings": ["Warnings regarding high voltage, batteries, heat, or chemicals"],
          "limitations": ["What cannot be assessed without opening the physical item"]
        }
        
        AI Safety Guidelines:
        - NEVER instruct the user to open high-voltage, mains electricity, gas, or chemical-containing casings.
        - Recommend certified technicians for internal battery replacements, power supply probing, or gas line valves.
        - Ensure every diagnosis contains a disclaimer: "AI-assisted assessment. This is not a certified professional diagnosis."
        
        Category Context:
        ${servicesContext}
      `;

      const prompt = `User Description: "${description}"`;
      const contents: any[] = [];

      if (mediaPath && fs.existsSync(mediaPath)) {
        // Resolve mimetype
        const ext = path.extname(mediaPath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        
        const mediaPart = this.fileToGenerativePart(mediaPath, mimeType);
        contents.push(mediaPart);
      }
      const combinedPrompt = `${systemPrompt}\n\nUser Issue Description: "${description}"`;
      contents.push(combinedPrompt);

      // Call Gemini model using standard SDK syntax
      const result = await model.generateContent(contents);

      const response = await result.response;
      let responseText = response.text() || '';
      if (responseText.includes('```')) {
        responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
      const parsedResult: AIDiagnosisResult = JSON.parse(responseText);
      
      // Fallback confidence
      if (parsedResult.confidence === undefined) {
        parsedResult.confidence = 0.85;
      }

      // Safety disclaimer assertion
      if (!parsedResult.limitations.some(l => l.includes('AI-assisted'))) {
        parsedResult.limitations.push('AI-assisted assessment. This is not a certified professional diagnosis.');
      }
      
      return parsedResult;
    } catch (error) {
      console.error('[AIService] Real Gemini API call failed. Falling back to mock diagnosis:', error);
      return this.getMockDiagnosis(category, description);
    }
  }

  /**
   * Generates the Repairability and worthiness assessment
   */
  public static async generateRepairAssessment(
    category: string,
    diagnosis: AIDiagnosisResult,
    itemAgeYears?: number
  ): Promise<RepairAssessmentResult> {
    // Load knowledge data to base pricing and replace limits
    const knowledge = await RepairKnowledge.findOne({ category });
    
    // Defaults if knowledge base is missing
    let replacementMin = 10000;
    let replacementMax = 25000;
    let estimatedMin = 1000;
    let estimatedMax = 3000;
    
    if (knowledge) {
      replacementMin = knowledge.replacementMin;
      replacementMax = knowledge.replacementMax;
      
      // Match AI identified causes to services inside knowledge base
      let matchedMin: number[] = [];
      let matchedMax: number[] = [];
      
      diagnosis.possibleCauses.forEach(pc => {
        const matchingService = knowledge.services.find(s => 
          pc.cause.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(pc.cause.toLowerCase())
        );
        if (matchingService) {
          matchedMin.push(matchingService.estimatedMin);
          matchedMax.push(matchingService.estimatedMax);
        }
      });
      
      if (matchedMin.length > 0) {
        estimatedMin = Math.min(...matchedMin);
        estimatedMax = Math.max(...matchedMax);
      } else {
        // Default to first service range
        estimatedMin = knowledge.services[0]?.estimatedMin || 500;
        estimatedMax = knowledge.services[0]?.estimatedMax || 1500;
      }
    }

    // Worthiness Engine Logic
    const avgRepair = (estimatedMin + estimatedMax) / 2;
    const avgReplacement = (replacementMin + replacementMax) / 2;
    const costRatio = avgRepair / avgReplacement;
    
    // Repairability score deduction factors
    let repairabilityScore = 85; // Base
    
    // Deduct for complexity in causes
    const maxConfidenceCause = diagnosis.possibleCauses.sort((a, b) => b.confidence - a.confidence)[0];
    if (maxConfidenceCause) {
      if (maxConfidenceCause.cause.toLowerCase().includes('logic board') || maxConfidenceCause.cause.toLowerCase().includes('motherboard')) {
        repairabilityScore -= 20; // Complex logic board fault
      }
    }
    
    // Deduct for item age
    const age = itemAgeYears || 2;
    if (age > 5) repairabilityScore -= 15;
    else if (age > 3) repairabilityScore -= 5;
    
    // Ensure boundaries
    repairabilityScore = Math.max(15, Math.min(95, repairabilityScore));

    let recommendation: RepairAssessmentResult['recommendation'] = 'repair_recommended';
    let reasoning = '';

    if (costRatio <= 0.4 && repairabilityScore >= 50) {
      recommendation = 'repair_recommended';
      reasoning = `Repair is highly recommended. The estimated repair cost (${estimatedMin}-${estimatedMax} INR) is significantly lower than replacing the item (${replacementMin}-${replacementMax} INR), and repairability is high.`;
    } else if (costRatio > 0.4 && costRatio < 0.7 && repairabilityScore >= 50) {
      recommendation = 'worthwhile';
      reasoning = `Repair may be worthwhile. The repair is cheaper than replacement, but the item's age (${age} years) or complexity suggests evaluating professional inspections first.`;
    } else {
      recommendation = 'replace_recommended';
      reasoning = `Replacement is recommended. The estimated repair cost is close to or exceeds the replacement value, or the item has low repairability due to circuit board integration.`;
    }

    // Safety checks: override if any cause suggests extreme danger
    const isDangerous = diagnosis.safetyWarnings.some(w => 
      w.toLowerCase().includes('high voltage') || 
      w.toLowerCase().includes('gas leak') || 
      w.toLowerCase().includes('explosion')
    );
    
    if (isDangerous) {
      recommendation = 'professional_needed';
      reasoning = 'High Risk: A certified professional must handle this inspection. Do not perform any DIY steps due to electric shock or hazardous chemical safety risks.';
    }

    return {
      estimatedMin,
      estimatedMax,
      replacementMin,
      replacementMax,
      currency: 'INR',
      repairabilityScore,
      recommendation,
      reasoning,
    };
  }

  private static getMockDiagnosis(category: string, description: string): AIDiagnosisResult {
    const raw = this.getRawMockDiagnosis(category, description);
    return {
      ...raw,
      confidence: 0.85,
    };
  }

  /**
   * Fetch deterministic mock diagnosis based on item category & desc keywords
   */
  private static getRawMockDiagnosis(category: string, description: string): Omit<AIDiagnosisResult, 'confidence'> {
    const desc = description.toLowerCase();

    if (category === 'Laptop') {
      if (desc.includes('black') || desc.includes('screen') || desc.includes('display')) {
        return {
          itemCategory: 'Laptop',
          identifiedItem: 'Generic Office Laptop (15.6")',
          visibleDamage: ['Keyboard backlight is functional', 'No external screen cracks visible'],
          possibleCauses: [
            { cause: 'Backlight inverter driver failure', confidence: 0.75 },
            { cause: 'Loose eDP display connector cable', confidence: 0.15 },
            { cause: 'Failed system RAM module initialization', confidence: 0.1 },
          ],
          troubleshootingSteps: [
            'Perform a hard reboot: Press and hold the power button for 15 seconds, then boot up.',
            'Connect an external monitor via HDMI to verify if the computer boots to desktop.',
            'Perform a display reset shortcut: Press Windows Key + Ctrl + Shift + B.',
          ],
          safetyWarnings: [
            'Do NOT attempt to open the display bezel or access internal battery cables while plugged into mains power.',
            'Internal capacitors on the display board can hold charge; exercise professional caution.',
          ],
          limitations: [
            'External inspection only. Precise circuitry failures cannot be pinpointed without multimeter diagnostics.',
            'AI-assisted assessment. This is not a certified professional diagnosis.',
          ],
        };
      }
      // General Laptop
      return {
        itemCategory: 'Laptop',
        identifiedItem: 'Standard Notebook Computer',
        visibleDamage: ['Wear and tear on chassis'],
        possibleCauses: [
          { cause: 'Operating System corruption', confidence: 0.5 },
          { cause: 'Power supply or battery degradation', confidence: 0.3 },
          { cause: 'Overheating due to dust blockage', confidence: 0.2 },
        ],
        troubleshootingSteps: [
          'Unplug all USB accessories, chargers, and restart.',
          'Verify the cooling vents are clear of dust and lint.',
        ],
        safetyWarnings: [
          'Lithium batteries represent fire risks if punctured. Do not force or dent the chassis.',
        ],
        limitations: [
          'Software faults require diagnostic boot files.',
          'AI-assisted assessment. This is not a certified professional diagnosis.',
        ],
      };
    }

    if (category === 'Smartphone') {
      if (desc.includes('crack') || desc.includes('broken') || desc.includes('screen')) {
        return {
          itemCategory: 'Smartphone',
          identifiedItem: 'Modern Touchscreen Smartphone',
          visibleDamage: ['Cracked front outer glass digitizer', 'Flickering horizontal lines on display panel'],
          possibleCauses: [
            { cause: 'Shattered LCD/OLED panel matrix', confidence: 0.8 },
            { cause: 'Loose display ribbon cable connector', confidence: 0.2 },
          ],
          troubleshootingSteps: [
            'Apply temporary screen protector or clear tape over cracks to prevent glass splinters.',
            'Back up your files immediately using cloud sync or computer link before touch inputs fail completely.',
          ],
          safetyWarnings: [
            'Avoid pressing hard on the cracked glass as it can pierce underlying Lithium batteries, causing smoke or thermal runaway.',
          ],
          limitations: [
            'Sub-frame structural damage cannot be evaluated without disassembling the device panel.',
            'AI-assisted assessment. This is not a certified professional diagnosis.',
          ],
        };
      }
      // General Smartphone
      return {
        itemCategory: 'Smartphone',
        identifiedItem: 'Generic Smartphone',
        visibleDamage: ['Charging port dust accumulation'],
        possibleCauses: [
          { cause: 'Charging port pin damage', confidence: 0.6 },
          { cause: 'Damaged charging adapter or cable', confidence: 0.4 },
        ],
        troubleshootingSteps: [
          'Carefully clean lint from the USB-C / Lightning port using a thin wooden toothpick.',
          'Test charging with a different certified wall brick and cable.',
        ],
        safetyWarnings: [
          'Do not use metallic pins or needles to scrape the charging port; this can short-circuit contacts.',
        ],
        limitations: [
          'Battery health capacity cannot be accurately polled without system diagnostic logs.',
          'AI-assisted assessment. This is not a certified professional diagnosis.',
        ],
      };
    }

    if (category === 'Bicycle') {
      return {
        itemCategory: 'Bicycle',
        identifiedItem: 'Hybrid Utility Bicycle',
        visibleDamage: ['Derailleur alignment slightly bent', 'Slack chain link tension'],
        possibleCauses: [
          { cause: 'Slack or stretched gear shift cables', confidence: 0.65 },
          { cause: 'Misaligned derailleur hanger bracket', confidence: 0.35 },
        ],
        troubleshootingSteps: [
          'Use the barrel adjuster on the rear derailleur to increase or decrease cable tension on index shifting.',
          'Verify if the chain is clean and lubricate links with bicycle lube.',
        ],
        safetyWarnings: [
          'Avoid placing fingers inside moving gears, chain wheels, or brake calipers during test rotations.',
        ],
        limitations: [
          'Torsional frame stress fractures require close physical ultrasonic inspection.',
          'AI-assisted assessment. This is not a certified professional diagnosis.',
        ],
      };
    }

    // Default Fallback
    return {
      itemCategory: category,
      identifiedItem: `Generic ${category} Unit`,
      visibleDamage: ['Indeterminate structural condition'],
      possibleCauses: [
        { cause: 'Internal hardware component failure', confidence: 0.5 },
        { cause: 'Aging components reaching end-of-life cycle', confidence: 0.5 },
      ],
      troubleshootingSteps: [
        'Disconnect power, wait 1 minute, and plug back in.',
        'Review the manufacturer guidelines manual for reset switch locations.',
      ],
      safetyWarnings: [
        'Mains Power: Unplug device immediately from sockets before attempting any inspection.',
      ],
      limitations: [
        'Detailed diagnostic values require specialized technician evaluation.',
        'AI-assisted assessment. This is not a certified professional diagnosis.',
      ],
    };
  }
}
