// RecoveryEngine.ts — Recovery pathway and valuation engine

export interface RecoveryPotentialResult {
  reusePotential: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  refurbishmentPotential: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  componentRecoveryPotential: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  materialRecoveryPotential: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedPathway: string;
  pathwayReason: string;
  suggestedComponents: Array<{
    name: string;
    category: string;
    status: string;
    confidence: string;
    evidenceSource: string;
  }>;
  materialStreams: Array<{
    material: string;
    confidence: string;
    evidenceSource: string;
    verificationStatus: string;
  }>;
  specializedRecyclingRequired: boolean;
}

export interface ValuationResult {
  indicativeMin: number;
  indicativeMax: number;
  currency: string;
  basis: string;
  isDemoData: boolean;
  disclaimer: string;
  insufficientData: boolean;
}

type PotentialLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

interface CategoryProfile {
  reusePotential: PotentialLevel;
  refurbishmentPotential: PotentialLevel;
  componentRecoveryPotential: PotentialLevel;
  materialRecoveryPotential: PotentialLevel;
  specializedRecyclingRequired: boolean;
  components: Array<{ name: string; category: string; status: string; confidence: string }>;
  materialStreams: Array<{ material: string; confidence: string }>;
  estimatedWeightKg: number;
  materialMixFactor: number; // fraction of weight that is recoverable at avg rate
}

const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  'Laptop': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'MEDIUM',
    componentRecoveryPotential: 'HIGH',
    materialRecoveryPotential: 'HIGH',
    specializedRecyclingRequired: true,
    estimatedWeightKg: 2.1,
    materialMixFactor: 0.6,
    components: [
      { name: 'RAM Module', category: 'Memory', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'SSD / Hard Drive', category: 'Storage', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'Display Panel', category: 'Display', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Battery Pack', category: 'Battery', status: 'SPECIAL_HANDLING', confidence: 'HIGH' },
      { name: 'Motherboard', category: 'PCB', status: 'MATERIAL_RECOVERY', confidence: 'HIGH' },
    ],
    materialStreams: [
      { material: 'Electronics (PCB)', confidence: 'HIGH' },
      { material: 'Copper-bearing components', confidence: 'MEDIUM' },
      { material: 'Aluminium / Steel chassis', confidence: 'HIGH' },
      { material: 'Lithium battery (special handling)', confidence: 'HIGH' },
      { material: 'Plastics', confidence: 'MEDIUM' },
    ],
  },
  'Air Conditioner': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'LOW',
    componentRecoveryPotential: 'MEDIUM',
    materialRecoveryPotential: 'HIGH',
    specializedRecyclingRequired: true,
    estimatedWeightKg: 35,
    materialMixFactor: 0.7,
    components: [
      { name: 'Compressor Unit', category: 'Compressor', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Copper Coil / Tubing', category: 'Copper', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'Fan Motor', category: 'Motor', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Control PCB', category: 'Electronics', status: 'MATERIAL_RECOVERY', confidence: 'MEDIUM' },
    ],
    materialStreams: [
      { material: 'Copper-bearing components (coil/tubing)', confidence: 'HIGH' },
      { material: 'Aluminium (fins/housing)', confidence: 'HIGH' },
      { material: 'Steel / Ferrous metal', confidence: 'HIGH' },
      { material: 'Electronics (PCB)', confidence: 'MEDIUM' },
      { material: 'Refrigerant (requires certified handling)', confidence: 'HIGH' },
      { material: 'Plastics', confidence: 'MEDIUM' },
    ],
  },
  'Ceiling Fan': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'LOW',
    componentRecoveryPotential: 'LOW',
    materialRecoveryPotential: 'MEDIUM',
    specializedRecyclingRequired: false,
    estimatedWeightKg: 3.5,
    materialMixFactor: 0.55,
    components: [
      { name: 'Motor Winding (copper)', category: 'Motor', status: 'MATERIAL_RECOVERY', confidence: 'HIGH' },
      { name: 'Capacitor', category: 'Electronics', status: 'MATERIAL_RECOVERY', confidence: 'MEDIUM' },
    ],
    materialStreams: [
      { material: 'Copper-bearing (motor winding)', confidence: 'HIGH' },
      { material: 'Steel / Ferrous metal (body)', confidence: 'HIGH' },
      { material: 'Aluminium (blades)', confidence: 'MEDIUM' },
      { material: 'Plastics', confidence: 'MEDIUM' },
      { material: 'Electronics (capacitor/PCB)', confidence: 'LOW' },
    ],
  },
  'Washing Machine': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'LOW',
    componentRecoveryPotential: 'MEDIUM',
    materialRecoveryPotential: 'HIGH',
    specializedRecyclingRequired: false,
    estimatedWeightKg: 45,
    materialMixFactor: 0.65,
    components: [
      { name: 'Drive Motor', category: 'Motor', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Stainless Steel Drum', category: 'Metal', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'Control PCB', category: 'Electronics', status: 'MATERIAL_RECOVERY', confidence: 'MEDIUM' },
    ],
    materialStreams: [
      { material: 'Steel / Ferrous metal (drum, body)', confidence: 'HIGH' },
      { material: 'Copper-bearing (motor)', confidence: 'HIGH' },
      { material: 'Electronics (PCB)', confidence: 'MEDIUM' },
      { material: 'Plastics', confidence: 'HIGH' },
    ],
  },
  'Refrigerator': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'LOW',
    componentRecoveryPotential: 'MEDIUM',
    materialRecoveryPotential: 'HIGH',
    specializedRecyclingRequired: true,
    estimatedWeightKg: 55,
    materialMixFactor: 0.65,
    components: [
      { name: 'Compressor', category: 'Compressor', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Copper / Aluminium Coil', category: 'Copper', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'Steel Body Panels', category: 'Metal', status: 'POTENTIALLY_REUSABLE', confidence: 'HIGH' },
    ],
    materialStreams: [
      { material: 'Steel / Ferrous metal', confidence: 'HIGH' },
      { material: 'Copper-bearing (coils)', confidence: 'HIGH' },
      { material: 'Aluminium', confidence: 'MEDIUM' },
      { material: 'Refrigerant (certified handling required)', confidence: 'HIGH' },
      { material: 'Plastics (liner)', confidence: 'MEDIUM' },
      { material: 'Electronics', confidence: 'LOW' },
    ],
  },
  'Smartphone': {
    reusePotential: 'LOW',
    refurbishmentPotential: 'MEDIUM',
    componentRecoveryPotential: 'HIGH',
    materialRecoveryPotential: 'MEDIUM',
    specializedRecyclingRequired: true,
    estimatedWeightKg: 0.18,
    materialMixFactor: 0.4,
    components: [
      { name: 'Display Module', category: 'Display', status: 'NEEDS_TESTING', confidence: 'LOW' },
      { name: 'Camera Module(s)', category: 'Camera', status: 'POTENTIALLY_REUSABLE', confidence: 'MEDIUM' },
      { name: 'Battery', category: 'Battery', status: 'SPECIAL_HANDLING', confidence: 'HIGH' },
    ],
    materialStreams: [
      { material: 'Electronics (PCB)', confidence: 'HIGH' },
      { material: 'Copper-bearing', confidence: 'MEDIUM' },
      { material: 'Aluminium / Glass (back panel)', confidence: 'MEDIUM' },
      { material: 'Lithium battery (special handling)', confidence: 'HIGH' },
    ],
  },
};

const DEFAULT_PROFILE: CategoryProfile = {
  reusePotential: 'LOW',
  refurbishmentPotential: 'LOW',
  componentRecoveryPotential: 'LOW',
  materialRecoveryPotential: 'MEDIUM',
  specializedRecyclingRequired: false,
  estimatedWeightKg: 5,
  materialMixFactor: 0.4,
  components: [],
  materialStreams: [
    { material: 'Mixed metals', confidence: 'LOW' },
    { material: 'Electronics', confidence: 'LOW' },
    { material: 'Plastics', confidence: 'LOW' },
  ],
};

const EVIDENCE_SOURCE = 'Product category knowledge + technician decision';

export function assessRecoveryPotential(
  category: string,
  _decision: string,
  _notes: string
): RecoveryPotentialResult {
  const profile = CATEGORY_PROFILES[category] || DEFAULT_PROFILE;

  // Determine recommended pathway
  let recommendedPathway: string;
  let pathwayReason: string;

  if (profile.componentRecoveryPotential === 'HIGH') {
    recommendedPathway = 'COMPONENT_RECOVERY';
    pathwayReason =
      'This product category typically contains components with reuse or testing potential. '
      + 'Component recovery + material recycling is recommended to maximise value preservation.';
  } else if (profile.materialRecoveryPotential === 'HIGH') {
    recommendedPathway = 'MATERIAL_RECYCLING';
    pathwayReason =
      'Component-level reuse potential is limited, but this product contains recoverable material streams '
      + 'that can be responsibly recycled.';
  } else if (profile.refurbishmentPotential === 'MEDIUM' || profile.refurbishmentPotential === 'HIGH') {
    recommendedPathway = 'REFURBISH';
    pathwayReason = 'Refurbishment may be possible depending on physical condition assessment by a recovery partner.';
  } else {
    recommendedPathway = 'RESPONSIBLE_DISPOSAL';
    pathwayReason = 'Limited recovery potential. Responsible disposal via a certified facility is recommended.';
  }

  return {
    reusePotential: profile.reusePotential,
    refurbishmentPotential: profile.refurbishmentPotential,
    componentRecoveryPotential: profile.componentRecoveryPotential,
    materialRecoveryPotential: profile.materialRecoveryPotential,
    recommendedPathway,
    pathwayReason,
    specializedRecyclingRequired: profile.specializedRecyclingRequired,
    suggestedComponents: profile.components.map((c) => ({
      ...c,
      evidenceSource: EVIDENCE_SOURCE,
    })),
    materialStreams: profile.materialStreams.map((m) => ({
      ...m,
      evidenceSource: EVIDENCE_SOURCE,
      verificationStatus: 'UNVERIFIED',
    })),
  };
}

export function calculateIndicativeValue(
  category: string,
  materialRates: Array<{ material: string; ratePerKg: number }>
): ValuationResult {
  const profile = CATEGORY_PROFILES[category] || DEFAULT_PROFILE;

  if (!materialRates || materialRates.length === 0) {
    return {
      indicativeMin: 0,
      indicativeMax: 0,
      currency: 'INR',
      basis: 'Insufficient rate data',
      isDemoData: true,
      disclaimer:
        'INDICATIVE ONLY — DEMO MARKET RATE DATA. Not a real market valuation. Request actual partner offers.',
      insufficientData: true,
    };
  }

  // Simple weighted average of material rates * weight * mix factor
  const avgRate =
    materialRates.reduce((sum, r) => sum + r.ratePerKg, 0) / materialRates.length;
  const estimatedRecoverableKg = profile.estimatedWeightKg * profile.materialMixFactor;
  const midValue = avgRate * estimatedRecoverableKg;
  const indicativeMin = Math.round(midValue * 0.8);
  const indicativeMax = Math.round(midValue * 1.25);

  return {
    indicativeMin,
    indicativeMax,
    currency: 'INR',
    basis: `Based on ~${profile.estimatedWeightKg}kg product weight × ${Math.round(profile.materialMixFactor * 100)}% recoverable mix × demo market rates`,
    isDemoData: true,
    disclaimer:
      'INDICATIVE ONLY — DEMO MARKET RATE DATA. Actual value depends on physical inspection, partner assessment, and current market conditions. Request actual partner offers.',
    insufficientData: false,
  };
}
