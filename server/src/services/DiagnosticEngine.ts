// DiagnosticEngine.ts — Interactive decision tree engine for RepairConnect

export interface DiagnosticAnswer {
  label: string;
  value: string;
  nextNode: string;
  safetyEscalate?: boolean;
}

export interface DiagnosticNode {
  id: string;
  question: string;
  type: 'boolean' | 'choice';
  answers: DiagnosticAnswer[];
}

export interface DiagnosticTree {
  category: string;
  startNode: string;
  nodes: Record<string, DiagnosticNode>;
}

export interface DiagnosticResult {
  primarySuspect: string;
  possibleAreas: string[];
  recommendedService: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SAFETY_CRITICAL';
  cannotDetermineRemotely: string[];
  nextStep: string;
  safetyFlagged: boolean;
  safetyMessage?: string;
}

// ── SAFETY TERMINAL NODE ─────────────────────────────────────────────────────
const SAFETY_NODE: DiagnosticNode = {
  id: 'SAFETY',
  question: 'SAFETY ALERT',
  type: 'boolean',
  answers: [{ label: 'I understand', value: 'ok', nextNode: 'END_SAFETY' }],
};

// ── TREES ────────────────────────────────────────────────────────────────────
const TREES: Record<string, DiagnosticTree> = {

  'Air Conditioner': {
    category: 'Air Conditioner',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Is the AC unit powering on (lights or display visible)?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Is there airflow coming from the indoor unit?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q4' }, { label: 'No', value: 'no', nextNode: 'END_MOTOR' }],
      },
      q3: {
        id: 'q3', question: 'Do you notice any burning smell or sparks near the unit?', type: 'boolean',
        answers: [
          { label: 'Yes — burning or sparks', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'q5' },
        ],
      },
      q4: {
        id: 'q4', question: 'Is the room not cooling despite airflow being present?', type: 'boolean',
        answers: [
          { label: 'Yes — cooling is insufficient', value: 'yes', nextNode: 'END_COOLING' },
          { label: 'No — cooling is fine intermittently', value: 'no', nextNode: 'END_INTERMITTENT' },
        ],
      },
      q5: {
        id: 'q5', question: 'Is there power at the wall socket (tested with another device)?', type: 'boolean',
        answers: [
          { label: 'Yes — socket works', value: 'yes', nextNode: 'END_INTERNAL_POWER' },
          { label: 'No — no power at socket', value: 'no', nextNode: 'END_EXTERNAL_POWER' },
        ],
      },
      SAFETY: SAFETY_NODE,
      END_SAFETY: { id: 'END_SAFETY', question: 'STOP USING. Contact technician.', type: 'boolean', answers: [] },
      END_MOTOR: { id: 'END_MOTOR', question: '', type: 'boolean', answers: [] },
      END_COOLING: { id: 'END_COOLING', question: '', type: 'boolean', answers: [] },
      END_INTERMITTENT: { id: 'END_INTERMITTENT', question: '', type: 'boolean', answers: [] },
      END_INTERNAL_POWER: { id: 'END_INTERNAL_POWER', question: '', type: 'boolean', answers: [] },
      END_EXTERNAL_POWER: { id: 'END_EXTERNAL_POWER', question: '', type: 'boolean', answers: [] },
    },
  },

  'Laptop': {
    category: 'Laptop',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Does the laptop power on (fan spins or keyboard lights up)?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Is there any display output or backlight?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q4' }, { label: 'No', value: 'no', nextNode: 'END_DISPLAY' }],
      },
      q3: {
        id: 'q3', question: 'Any burning smell or visible damage to the charger or port?', type: 'boolean',
        answers: [
          { label: 'Yes — burning smell', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'q5' },
        ],
      },
      q4: {
        id: 'q4', question: 'Does the laptop overheat and shut down quickly?', type: 'boolean',
        answers: [
          { label: 'Yes — gets very hot', value: 'yes', nextNode: 'END_THERMAL' },
          { label: 'No', value: 'no', nextNode: 'END_SOFTWARE' },
        ],
      },
      q5: {
        id: 'q5', question: 'Does the charging indicator light up when plugged in?', type: 'boolean',
        answers: [
          { label: 'Yes', value: 'yes', nextNode: 'END_MAINBOARD' },
          { label: 'No', value: 'no', nextNode: 'END_BATTERY_CHARGER' },
        ],
      },
      SAFETY: SAFETY_NODE,
      END_DISPLAY: { id: 'END_DISPLAY', question: '', type: 'boolean', answers: [] },
      END_THERMAL: { id: 'END_THERMAL', question: '', type: 'boolean', answers: [] },
      END_SOFTWARE: { id: 'END_SOFTWARE', question: '', type: 'boolean', answers: [] },
      END_MAINBOARD: { id: 'END_MAINBOARD', question: '', type: 'boolean', answers: [] },
      END_BATTERY_CHARGER: { id: 'END_BATTERY_CHARGER', question: '', type: 'boolean', answers: [] },
      END_SAFETY: { id: 'END_SAFETY', question: '', type: 'boolean', answers: [] },
    },
  },

  'Ceiling Fan': {
    category: 'Ceiling Fan',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Does the fan power on at all (any movement or hum)?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Does it make a grinding or loud noise while running?', type: 'boolean',
        answers: [
          { label: 'Yes — grinding noise', value: 'yes', nextNode: 'END_BEARING' },
          { label: 'No', value: 'no', nextNode: 'END_SPEED' },
        ],
      },
      q3: {
        id: 'q3', question: 'Is there a burning smell or sparks from the motor area?', type: 'boolean',
        answers: [
          { label: 'Yes', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'q4' },
        ],
      },
      q4: {
        id: 'q4', question: 'Is the power supply reaching the fan (switch works for other fixtures)?', type: 'boolean',
        answers: [
          { label: 'Yes', value: 'yes', nextNode: 'END_MOTOR' },
          { label: 'No', value: 'no', nextNode: 'END_WIRING' },
        ],
      },
      SAFETY: SAFETY_NODE,
      END_BEARING: { id: 'END_BEARING', question: '', type: 'boolean', answers: [] },
      END_SPEED: { id: 'END_SPEED', question: '', type: 'boolean', answers: [] },
      END_MOTOR: { id: 'END_MOTOR', question: '', type: 'boolean', answers: [] },
      END_WIRING: { id: 'END_WIRING', question: '', type: 'boolean', answers: [] },
      END_SAFETY: { id: 'END_SAFETY', question: '', type: 'boolean', answers: [] },
    },
  },

  'Washing Machine': {
    category: 'Washing Machine',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Does the washing machine power on?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Is it filling with water normally?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q4' }, { label: 'No', value: 'no', nextNode: 'END_VALVE' }],
      },
      q3: {
        id: 'q3', question: 'Is there any burning smell or visible leakage from below?', type: 'boolean',
        answers: [
          { label: 'Yes — burning or major leak', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'END_POWER' },
        ],
      },
      q4: {
        id: 'q4', question: 'Does it agitate/spin the drum?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'END_DRAIN' }, { label: 'No', value: 'no', nextNode: 'END_MOTOR' }],
      },
      SAFETY: SAFETY_NODE,
      END_VALVE: { id: 'END_VALVE', question: '', type: 'boolean', answers: [] },
      END_POWER: { id: 'END_POWER', question: '', type: 'boolean', answers: [] },
      END_DRAIN: { id: 'END_DRAIN', question: '', type: 'boolean', answers: [] },
      END_MOTOR: { id: 'END_MOTOR', question: '', type: 'boolean', answers: [] },
      END_SAFETY: { id: 'END_SAFETY', question: '', type: 'boolean', answers: [] },
    },
  },

  'Refrigerator': {
    category: 'Refrigerator',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Is the refrigerator running (compressor sound or interior light on)?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Is it cooling sufficiently inside?', type: 'boolean',
        answers: [
          { label: 'Yes — cooling fine', value: 'yes', nextNode: 'END_INTERMITTENT' },
          { label: 'No — not cold enough', value: 'no', nextNode: 'END_COOLING' },
        ],
      },
      q3: {
        id: 'q3', question: 'Is there a burning smell or visible leakage around the base?', type: 'boolean',
        answers: [
          { label: 'Yes', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'END_POWER' },
        ],
      },
      SAFETY: SAFETY_NODE,
      END_COOLING: { id: 'END_COOLING', question: '', type: 'boolean', answers: [] },
      END_INTERMITTENT: { id: 'END_INTERMITTENT', question: '', type: 'boolean', answers: [] },
      END_POWER: { id: 'END_POWER', question: '', type: 'boolean', answers: [] },
      END_SAFETY: { id: 'END_SAFETY', question: '', type: 'boolean', answers: [] },
    },
  },

  'Smartphone': {
    category: 'Smartphone',
    startNode: 'q1',
    nodes: {
      q1: {
        id: 'q1', question: 'Does the phone power on at all?', type: 'boolean',
        answers: [{ label: 'Yes', value: 'yes', nextNode: 'q2' }, { label: 'No', value: 'no', nextNode: 'q3' }],
      },
      q2: {
        id: 'q2', question: 'Is the screen cracked, unresponsive or showing display issues?', type: 'boolean',
        answers: [
          { label: 'Yes — screen issue', value: 'yes', nextNode: 'END_SCREEN' },
          { label: 'No — screen looks fine', value: 'no', nextNode: 'END_SOFTWARE' },
        ],
      },
      q3: {
        id: 'q3', question: 'Is the battery swollen or does the phone get unusually hot?', type: 'boolean',
        answers: [
          { label: 'Yes — swollen or very hot', value: 'yes', nextNode: 'SAFETY', safetyEscalate: true },
          { label: 'No', value: 'no', nextNode: 'END_BATTERY' },
        ],
      },
      SAFETY: SAFETY_NODE,
      END_SCREEN: { id: 'END_SCREEN', question: '', type: 'boolean', answers: [] },
      END_SOFTWARE: { id: 'END_SOFTWARE', question: '', type: 'boolean', answers: [] },
      END_BATTERY: { id: 'END_BATTERY', question: '', type: 'boolean', answers: [] },
      END_SAFETY: { id: 'END_SAFETY', question: '', type: 'boolean', answers: [] },
    },
  },
};

// ── RESULT MAP ────────────────────────────────────────────────────────────────
const RESULT_MAP: Record<string, Record<string, DiagnosticResult>> = {
  'Air Conditioner': {
    END_MOTOR: { primarySuspect: 'Fan motor or blower', possibleAreas: ['Fan motor', 'Capacitor', 'Blower assembly'], recommendedService: 'AC Fan Motor Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Capacitor test', 'Motor winding check'], nextStep: 'Book a technician visit for fan motor diagnosis', safetyFlagged: false },
    END_COOLING: { primarySuspect: 'Cooling system area', possibleAreas: ['Refrigerant level (needs technician)', 'Compressor area', 'Condenser', 'Evaporator coil'], recommendedService: 'AC Diagnostic Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Refrigerant pressure', 'Compressor health', 'Internal coil condition'], nextStep: 'Book an AC diagnostic inspection — technician must physically assess cooling system', safetyFlagged: false },
    END_INTERMITTENT: { primarySuspect: 'Thermostat or control board', possibleAreas: ['Thermostat sensor', 'Control PCB', 'Intermittent connection'], recommendedService: 'AC Control System Inspection', severity: 'LOW', cannotDetermineRemotely: ['PCB diagnostics', 'Sensor calibration'], nextStep: 'Book a technician visit', safetyFlagged: false },
    END_INTERNAL_POWER: { primarySuspect: 'Internal power supply or PCB', possibleAreas: ['Internal fuse', 'Control board', 'Power module'], recommendedService: 'AC Electrical Inspection', severity: 'HIGH', cannotDetermineRemotely: ['PCB continuity', 'Fuse integrity'], nextStep: 'Do not attempt to open the unit. Book a certified technician.', safetyFlagged: false },
    END_EXTERNAL_POWER: { primarySuspect: 'External power supply', possibleAreas: ['Wall socket', 'Circuit breaker', 'Extension cable'], recommendedService: 'External power check first', severity: 'LOW', cannotDetermineRemotely: [], nextStep: 'Check circuit breaker. If socket is confirmed working and AC still fails, book a technician.', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Potential electrical hazard', possibleAreas: ['Electrical fault'], recommendedService: 'Emergency Electrical Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: ['Root cause of burning'], nextStep: 'STOP USING IMMEDIATELY. Contact a certified electrician or technician.', safetyFlagged: true, safetyMessage: 'Burning smell or sparks indicate a potential electrical hazard. Stop using the appliance immediately.' },
  },
  'Laptop': {
    END_DISPLAY: { primarySuspect: 'Display or GPU area', possibleAreas: ['LCD/display panel', 'GPU', 'eDP cable', 'Backlight inverter'], recommendedService: 'Laptop Display Diagnostic', severity: 'HIGH', cannotDetermineRemotely: ['Panel integrity', 'GPU health', 'Cable condition'], nextStep: 'Book a laptop diagnostic visit', safetyFlagged: false },
    END_THERMAL: { primarySuspect: 'Thermal / cooling system', possibleAreas: ['Cooling fan', 'Thermal paste', 'Heat sink', 'Ventilation blockage'], recommendedService: 'Laptop Thermal Cleaning & Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Internal dust level', 'Thermal compound condition'], nextStep: 'Book a thermal cleaning service before hardware damage worsens', safetyFlagged: false },
    END_SOFTWARE: { primarySuspect: 'Software or OS issue', possibleAreas: ['Operating system', 'Driver conflict', 'Startup program'], recommendedService: 'Software Diagnostic', severity: 'LOW', cannotDetermineRemotely: ['Full software state'], nextStep: 'Try a basic restart. If persistent, book a software diagnostic visit.', safetyFlagged: false },
    END_MAINBOARD: { primarySuspect: 'Motherboard area', possibleAreas: ['Mainboard', 'Power IC', 'RAM seating'], recommendedService: 'Motherboard Inspection', severity: 'HIGH', cannotDetermineRemotely: ['Board-level diagnostics'], nextStep: 'Book a motherboard inspection — requires specialized equipment', safetyFlagged: false },
    END_BATTERY_CHARGER: { primarySuspect: 'Battery or charger', possibleAreas: ['Battery', 'Charging port', 'Charger cable'], recommendedService: 'Battery & Charging Port Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Battery cell health', 'Port integrity'], nextStep: 'Try a different charger if available. Then book a battery/port inspection.', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Potential electrical/battery hazard', possibleAreas: ['Battery', 'Charger', 'Internal wiring'], recommendedService: 'Emergency Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: [], nextStep: 'STOP USING. Disconnect from power. Do not attempt to open. Contact a technician immediately.', safetyFlagged: true, safetyMessage: 'Burning smell indicates a potential battery or electrical fault. Stop use immediately.' },
  },
  'Ceiling Fan': {
    END_BEARING: { primarySuspect: 'Bearing assembly', possibleAreas: ['Blade bearings', 'Motor shaft', 'Blade alignment'], recommendedService: 'Fan Bearing Replacement', severity: 'MEDIUM', cannotDetermineRemotely: ['Bearing wear level'], nextStep: 'Book a fan inspection — grinding noise typically means bearing replacement needed', safetyFlagged: false },
    END_SPEED: { primarySuspect: 'Speed regulator or capacitor', possibleAreas: ['Fan capacitor', 'Speed regulator', 'Winding'], recommendedService: 'Fan Electrical Inspection', severity: 'LOW', cannotDetermineRemotely: ['Capacitor test', 'Winding resistance'], nextStep: 'Book a fan capacitor/regulator check', safetyFlagged: false },
    END_MOTOR: { primarySuspect: 'Motor or winding', possibleAreas: ['Motor coil', 'Capacitor', 'Internal winding'], recommendedService: 'Fan Motor Inspection', severity: 'HIGH', cannotDetermineRemotely: ['Winding continuity', 'Motor health'], nextStep: 'Book a fan motor inspection', safetyFlagged: false },
    END_WIRING: { primarySuspect: 'Wiring or switch', possibleAreas: ['Wall switch', 'Fan wiring', 'MCB/breaker'], recommendedService: 'Electrical Wiring Check', severity: 'MEDIUM', cannotDetermineRemotely: ['Circuit continuity'], nextStep: 'Check the wall switch and circuit breaker. If fine, book an electrician.', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Electrical hazard in motor', possibleAreas: ['Motor winding short', 'Wiring fault'], recommendedService: 'Emergency Fan Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: [], nextStep: 'STOP USING. Switch off at mains. Contact a certified electrician.', safetyFlagged: true, safetyMessage: 'Burning smell from a fan motor indicates a potential winding short. Stop use immediately.' },
  },
  'Washing Machine': {
    END_VALVE: { primarySuspect: 'Inlet valve or water supply', possibleAreas: ['Inlet solenoid valve', 'Water tap', 'Filter mesh'], recommendedService: 'Washing Machine Water Inlet Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Valve solenoid test'], nextStep: 'Check if the water tap is fully open. Then book an inlet valve inspection.', safetyFlagged: false },
    END_POWER: { primarySuspect: 'Power supply or control board', possibleAreas: ['Power fuse', 'Control PCB', 'Door interlock'], recommendedService: 'Electrical Inspection', severity: 'HIGH', cannotDetermineRemotely: ['PCB diagnostics'], nextStep: 'Book a control system inspection', safetyFlagged: false },
    END_DRAIN: { primarySuspect: 'Drain pump or hose', possibleAreas: ['Drain pump', 'Drain hose', 'Filter blockage'], recommendedService: 'Drain System Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Pump motor test'], nextStep: 'Check if the drain hose is kinked or blocked. Then book a drain system inspection.', safetyFlagged: false },
    END_MOTOR: { primarySuspect: 'Drive motor or belt', possibleAreas: ['Drive motor', 'Drive belt', 'Drum bearing'], recommendedService: 'Drum Drive Inspection', severity: 'HIGH', cannotDetermineRemotely: ['Motor health', 'Belt condition'], nextStep: 'Book a drum drive inspection', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Electrical or water hazard', possibleAreas: ['Internal wiring', 'PCB leak contact'], recommendedService: 'Emergency Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: [], nextStep: 'SWITCH OFF and UNPLUG. Do not touch water near the machine. Contact a technician.', safetyFlagged: true, safetyMessage: 'Burning smell or major leakage near a running appliance is a safety hazard. Stop use immediately.' },
  },
  'Refrigerator': {
    END_COOLING: { primarySuspect: 'Cooling system', possibleAreas: ['Compressor (needs technician)', 'Thermostat', 'Condenser coil (dirty)', 'Door seal'], recommendedService: 'Refrigerator Diagnostic Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Compressor pressure', 'Gas level', 'Thermostat calibration'], nextStep: 'Check door seals for gaps first. Then book a refrigerator diagnostic inspection.', safetyFlagged: false },
    END_INTERMITTENT: { primarySuspect: 'Thermostat or sensor', possibleAreas: ['Temperature sensor', 'Defrost system'], recommendedService: 'Refrigerator Sensor Inspection', severity: 'LOW', cannotDetermineRemotely: ['Sensor calibration'], nextStep: 'Book a refrigerator inspection', safetyFlagged: false },
    END_POWER: { primarySuspect: 'Power supply or compressor start', possibleAreas: ['Start relay', 'Compressor capacitor', 'PCB'], recommendedService: 'Refrigerator Electrical Inspection', severity: 'HIGH', cannotDetermineRemotely: ['Start relay test', 'Compressor health'], nextStep: 'Book a refrigerator electrical inspection', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Refrigerant leak or electrical fault', possibleAreas: ['Refrigerant line', 'Compressor', 'Wiring'], recommendedService: 'Emergency Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: [], nextStep: 'STOP USING. Ensure ventilation. Contact a certified technician.', safetyFlagged: true, safetyMessage: 'A burning smell or gas-like odour from a refrigerator may indicate a refrigerant or electrical hazard.' },
  },
  'Smartphone': {
    END_SCREEN: { primarySuspect: 'Display panel or digitizer', possibleAreas: ['LCD/OLED panel', 'Touch digitizer', 'Display flex cable'], recommendedService: 'Screen Replacement/Repair', severity: 'MEDIUM', cannotDetermineRemotely: ['Digitizer vs panel fault'], nextStep: 'Book a screen inspection and replacement quote', safetyFlagged: false },
    END_SOFTWARE: { primarySuspect: 'Software or OS', possibleAreas: ['OS corruption', 'App conflict'], recommendedService: 'Software Diagnostic', severity: 'LOW', cannotDetermineRemotely: ['Full software state'], nextStep: 'Try a safe mode restart. If issue persists, book a software diagnostic.', safetyFlagged: false },
    END_BATTERY: { primarySuspect: 'Battery or charging port', possibleAreas: ['Battery cells', 'Charging port', 'Charging IC'], recommendedService: 'Battery & Port Inspection', severity: 'MEDIUM', cannotDetermineRemotely: ['Battery cell health', 'Charging IC test'], nextStep: 'Try a different cable. If still fails, book a battery inspection.', safetyFlagged: false },
    END_SAFETY: { primarySuspect: 'Battery hazard', possibleAreas: ['Lithium battery swelling', 'Thermal runaway risk'], recommendedService: 'Emergency Battery Inspection', severity: 'SAFETY_CRITICAL', cannotDetermineRemotely: [], nextStep: 'STOP USING. Do NOT charge. Keep away from flammable materials. Contact a technician urgently.', safetyFlagged: true, safetyMessage: 'A swollen or extremely hot battery is a fire/explosion risk. Stop use and handle with extreme care.' },
  },
};

// Default for unknown categories
const DEFAULT_RESULT: DiagnosticResult = {
  primarySuspect: 'Unknown',
  possibleAreas: ['Internal components requiring physical inspection'],
  recommendedService: 'General Diagnostic Inspection',
  severity: 'MEDIUM',
  cannotDetermineRemotely: ['Most internal faults'],
  nextStep: 'Book a general diagnostic inspection with a qualified technician.',
  safetyFlagged: false,
};

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export function getDiagnosticTree(category: string): DiagnosticTree | null {
  return TREES[category] || null;
}

export function getNode(tree: DiagnosticTree, nodeId: string): DiagnosticNode | null {
  return tree.nodes[nodeId] || null;
}

export function getSupportedCategories(): string[] {
  return Object.keys(TREES);
}

export function computeResult(
  category: string,
  answers: Array<{ questionId: string; answer: string }>
): DiagnosticResult {
  const tree = getDiagnosticTree(category);
  if (!tree) return DEFAULT_RESULT;

  // Walk tree to find the terminal node
  let currentNodeId = tree.startNode;
  let safetyTriggered = false;
  let terminalNodeId = currentNodeId;

  for (const { questionId, answer } of answers) {
    const node = tree.nodes[currentNodeId];
    if (!node) break;
    if (node.id === 'SAFETY') { safetyTriggered = true; break; }

    const matched = node.answers.find((a) => a.value === answer);
    if (!matched) break;
    if (matched.safetyEscalate) { safetyTriggered = true; terminalNodeId = 'END_SAFETY'; break; }

    terminalNodeId = matched.nextNode;
    currentNodeId = matched.nextNode;
    if (currentNodeId.startsWith('END_')) break;
  }

  if (safetyTriggered) terminalNodeId = 'END_SAFETY';

  const categoryResults = RESULT_MAP[category];
  if (categoryResults && categoryResults[terminalNodeId]) {
    return categoryResults[terminalNodeId];
  }
  return DEFAULT_RESULT;
}

