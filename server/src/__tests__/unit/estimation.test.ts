import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService, AIDiagnosisResult } from '../../services/AIService';
import { RepairKnowledge } from '../../models/RepairKnowledge';

// Mock the Mongoose RepairKnowledge model
vi.mock('../../models/RepairKnowledge', () => {
  return {
    RepairKnowledge: {
      findOne: vi.fn(),
    },
  };
});

describe('Worthiness Estimation Engine Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should recommend repair when repair costs are low relative to replacement', async () => {
    // Mock database context lookup
    (RepairKnowledge.findOne as any).mockResolvedValue({
      replacementMin: 50000,
      replacementMax: 80000,
      services: [
        { name: 'Backlight inverter driver failure', estimatedMin: 2000, estimatedMax: 4000 },
      ],
    });

    const mockDiagnosis: AIDiagnosisResult = {
      itemCategory: 'Laptop',
      identifiedItem: 'Mock Laptop',
      visibleDamage: [],
      possibleCauses: [
        { cause: 'Backlight inverter driver failure', confidence: 0.8 },
      ],
      confidence: 0.85,
      troubleshootingSteps: [],
      safetyWarnings: [],
      limitations: [],
    };

    const assessment = await AIService.generateRepairAssessment('Laptop', mockDiagnosis, 2);

    expect(assessment.recommendation).toBe('repair_recommended');
    expect(assessment.repairabilityScore).toBeGreaterThanOrEqual(50);
    expect(assessment.reasoning).toContain('Repair is highly recommended');
  });

  it('should recommend replacement when repair costs are high relative to replacement', async () => {
    (RepairKnowledge.findOne as any).mockResolvedValue({
      replacementMin: 10000,
      replacementMax: 15000,
      services: [
        { name: 'Shattered LCD/OLED panel matrix', estimatedMin: 8000, estimatedMax: 9500 },
      ],
    });

    const mockDiagnosis: AIDiagnosisResult = {
      itemCategory: 'Smartphone',
      identifiedItem: 'Mock Phone',
      visibleDamage: [],
      possibleCauses: [
        { cause: 'Shattered LCD/OLED panel matrix', confidence: 0.9 },
      ],
      confidence: 0.85,
      troubleshootingSteps: [],
      safetyWarnings: [],
      limitations: [],
    };

    const assessment = await AIService.generateRepairAssessment('Smartphone', mockDiagnosis, 4);

    expect(assessment.recommendation).toBe('replace_recommended');
    expect(assessment.reasoning).toContain('Replacement is recommended');
  });

  it('should override recommendation to professional inspection if safety hazards are detected', async () => {
    (RepairKnowledge.findOne as any).mockResolvedValue({
      replacementMin: 30000,
      replacementMax: 60000,
      services: [
        { name: 'Compressor Starter Relay Swap', estimatedMin: 2000, estimatedMax: 4000 },
      ],
    });

    const mockDiagnosis: AIDiagnosisResult = {
      itemCategory: 'Refrigerator',
      identifiedItem: 'Mock Refrigerator',
      visibleDamage: [],
      possibleCauses: [
        { cause: 'Compressor Starter Relay Swap', confidence: 0.9 },
      ],
      confidence: 0.85,
      troubleshootingSteps: [],
      safetyWarnings: ['High Voltage: Compressor relays carry lethal wall currents. Disconnect plug.'],
      limitations: [],
    };

    const assessment = await AIService.generateRepairAssessment('Refrigerator', mockDiagnosis, 1);

    expect(assessment.recommendation).toBe('professional_needed');
    expect(assessment.reasoning).toContain('High Risk');
  });
});
