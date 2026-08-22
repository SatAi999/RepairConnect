import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env before importing models
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../models/User';
import { RepairerProfile } from '../models/RepairerProfile';
import { RepairKnowledge } from '../models/RepairKnowledge';
import { RepairCase } from '../models/RepairCase';
import { RepairRequest } from '../models/RepairRequest';
import { RepairStatusHistory } from '../models/RepairStatusHistory';
import { Review } from '../models/Review';
import { Notification } from '../models/Notification';

export const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/repairconnect';
  
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    
    console.log('Clearing database collections for seed data...');
    await User.deleteMany({});
    await RepairerProfile.deleteMany({});
    await RepairKnowledge.deleteMany({});
    await RepairCase.deleteMany({});
    await RepairRequest.deleteMany({});
    await RepairStatusHistory.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});

    console.log('Seeding Repair Knowledge Reference Database...');
    const knowledgeData = [
      {
        category: 'Laptop',
        replacementMin: 45000,
        replacementMax: 90000,
        weight: 2.1,
        co2Avoided: 220,
        safetyWarnings: [
          'Unplug display inverter connections carefully; backlight channels generate high voltage.',
          'Do not puncture lithium-ion battery cells. Disconnect batteries immediately upon casing removal.',
        ],
        services: [
          { name: 'Screen Replacement', estimatedMin: 3500, estimatedMax: 7500 },
          { name: 'Battery Replacement', estimatedMin: 1800, estimatedMax: 4000 },
          { name: 'Keyboard/Trackpad Fix', estimatedMin: 1200, estimatedMax: 3000 },
          { name: 'Charging Port Repair', estimatedMin: 800, estimatedMax: 1800 },
          { name: 'Logic Board Diagnostic', estimatedMin: 2500, estimatedMax: 8000 },
        ],
        typicalCauses: [
          { cause: 'Backlight inverter driver failure', probability: 0.4 },
          { cause: 'Loose eDP display connector cable', probability: 0.3 },
          { cause: 'Liquid spill short circuit', probability: 0.2 },
        ],
      },
      {
        category: 'Smartphone',
        replacementMin: 15000,
        replacementMax: 50000,
        weight: 0.18,
        co2Avoided: 70,
        safetyWarnings: [
          'Lithium batteries are explosive under structural deformation. Use plastic pry tools only.',
          'Avoid skin contact with broken glass shards of cracked digitizers.',
        ],
        services: [
          { name: 'Cracked Screen Repair', estimatedMin: 1500, estimatedMax: 5500 },
          { name: 'Battery Swap', estimatedMin: 1000, estimatedMax: 2500 },
          { name: 'Charging Port Replacement', estimatedMin: 600, estimatedMax: 1500 },
          { name: 'Water Damage Desiccation', estimatedMin: 1000, estimatedMax: 3000 },
        ],
        typicalCauses: [
          { cause: 'Shattered LCD/OLED panel matrix', probability: 0.7 },
          { cause: 'Charging port pin corrosion', probability: 0.2 },
        ],
      },
      {
        category: 'Bicycle',
        replacementMin: 8000,
        replacementMax: 25000,
        weight: 14.5,
        co2Avoided: 150,
        safetyWarnings: [
          'Ensure brake cables are completely tensioned and crimped before testing.',
        ],
        services: [
          { name: 'Gear Shifting Tuning', estimatedMin: 400, estimatedMax: 1200 },
          { name: 'Brake Cable/Pad Install', estimatedMin: 300, estimatedMax: 800 },
          { name: 'Chain Replacement', estimatedMin: 500, estimatedMax: 1500 },
          { name: 'Wheel Truing/Spokes', estimatedMin: 400, estimatedMax: 1000 },
        ],
        typicalCauses: [
          { cause: 'Slack shift cable stretch', probability: 0.5 },
          { cause: 'Bent rear derailleur hanger', probability: 0.3 },
        ],
      },
      {
        category: 'Refrigerator',
        replacementMin: 22000,
        replacementMax: 65000,
        weight: 75,
        co2Avoided: 800,
        safetyWarnings: [
          'High Risk: Fridge systems run on pressurised refrigerant gas (R600a/R134a). Do not pierce tubes.',
          'Always isolate the appliance from mains wall plugs before checking compressor starter relays.',
        ],
        services: [
          { name: 'Compressor Relay Swap', estimatedMin: 1500, estimatedMax: 3500 },
          { name: 'Gas Refilling/Recharge', estimatedMin: 2000, estimatedMax: 4500 },
          { name: 'Thermostat Replacement', estimatedMin: 1000, estimatedMax: 2500 },
          { name: 'Defrost Fan Repair', estimatedMin: 800, estimatedMax: 2000 },
        ],
        typicalCauses: [
          { cause: 'Failed start capacitor relay', probability: 0.5 },
          { cause: 'Refrigerant slow leak', probability: 0.3 },
        ],
      },
    ];

    await RepairKnowledge.insertMany(knowledgeData);
    console.log('Seeded knowledge parameters.');

    console.log('Seeding Demo Accounts...');
    const hashedPwd = await bcrypt.hash('password123', 10);

    // 1. Customer User
    const customer = await User.create({
      name: 'John Customer',
      email: 'customer@example.com',
      passwordHash: hashedPwd,
      role: 'CUSTOMER',
      phone: '9000000001',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Central Bangalore
    });

    // 2. Admin User
    const admin = await User.create({
      name: 'Sarah Admin',
      email: 'admin@example.com',
      passwordHash: hashedPwd,
      role: 'ADMIN',
      phone: '9000000002',
    });

    // 3. Repairer Accounts
    // Repairer A (Closest, moderate rating)
    const uA = await User.create({
      name: 'Devon Tech',
      email: 'repairer@example.com',
      passwordHash: hashedPwd,
      role: 'REPAIRER',
      phone: '9000000003',
      location: { type: 'Point', coordinates: [77.6010, 12.9780] }, // ~1.1 km away
    });
    
    const pA = await RepairerProfile.create({
      userId: uA._id,
      businessName: 'Express Tech Solutions',
      description: 'Superfast hardware diagnostics and screen replacements for laptops and smartphones. Conveniently located near City Mall.',
      categories: ['Laptop', 'Smartphone'],
      services: ['Screen Replacement', 'Battery Swap', 'Charging Port Repair', 'Hardware Repairs'],
      location: uA.location,
      serviceRadius: 8,
      verificationStatus: 'VERIFIED',
      rating: 4.6,
      reviewCount: 14,
      estimatedPriceRange: { min: 600, max: 5000 },
      availability: 'Mon-Sat 10AM-8PM',
    });

    // Repairer B (Highest Rated, slightly further)
    const uB = await User.create({
      name: 'Nitin Kumar',
      email: 'quickfix@example.com',
      passwordHash: hashedPwd,
      role: 'REPAIRER',
      phone: '9000000004',
      location: { type: 'Point', coordinates: [77.5850, 12.9650] }, // ~1.3 km away
    });
    
    const pB = await RepairerProfile.create({
      userId: uB._id,
      businessName: 'QuickFix Electronics',
      description: 'Expert board level micro-soldering, GPU reflows, and water damage remediation. Certified technicians.',
      categories: ['Laptop', 'Smartphone'],
      services: ['Logic Board Diagnostic', 'Cracked Screen Repair', 'Water Damage Desiccation', 'Battery Swap'],
      location: uB.location,
      serviceRadius: 15,
      verificationStatus: 'VERIFIED',
      rating: 4.9,
      reviewCount: 32,
      estimatedPriceRange: { min: 1000, max: 8000 },
      availability: 'Mon-Fri 9AM-7PM',
    });

    // Repairer C (Bicycle specialist, further away)
    const uC = await User.create({
      name: 'Rohan cycles',
      email: 'ecocycles@example.com',
      passwordHash: hashedPwd,
      role: 'REPAIRER',
      phone: '9000000005',
      location: { type: 'Point', coordinates: [77.6100, 12.9550] }, // ~2.5 km away
    });
    
    const pC = await RepairerProfile.create({
      userId: uC._id,
      businessName: 'EcoCycles & Gears',
      description: 'Friendly local bike mechanics. Shifting alignments, spoke balancing, and tube repairs. We love clean gears.',
      categories: ['Bicycle'],
      services: ['Gear Shifting Tuning', 'Brake Cable/Pad Install', 'Chain Replacement', 'Wheel Truing/Spokes'],
      location: uC.location,
      serviceRadius: 5,
      verificationStatus: 'VERIFIED',
      rating: 4.7,
      reviewCount: 8,
      estimatedPriceRange: { min: 300, max: 1500 },
      availability: 'Tue-Sun 8AM-5PM',
    });

    // Repairer D (Appliance specialist, furthest)
    const uD = await User.create({
      name: 'Amrit Singh',
      email: 'appliances@example.com',
      passwordHash: hashedPwd,
      role: 'REPAIRER',
      phone: '9000000006',
      location: { type: 'Point', coordinates: [77.5600, 12.9900] }, // ~4.2 km away
    });
    
    const pD = await RepairerProfile.create({
      userId: uD._id,
      businessName: 'Local Appliance Pros',
      description: 'Professional diagnosis and repairs for refrigerators, washers, and dryers. In-home visits.',
      categories: ['Refrigerator'],
      services: ['Compressor Relay Swap', 'Gas Refilling/Recharge', 'Thermostat Replacement'],
      location: uD.location,
      serviceRadius: 20,
      verificationStatus: 'PENDING', // Demo of pending status
      rating: 4.3,
      reviewCount: 19,
      estimatedPriceRange: { min: 800, max: 4500 },
      availability: 'Mon-Sat 9AM-6PM',
    });

    console.log('Seeded Users & Profiles.');

    // Seed some reviews for Devon Tech (Repairer A)
    await Review.create({
      repairRequestId: new mongoose.Types.ObjectId(), // Fake request ID for seeding
      userId: customer._id,
      repairerId: pA._id,
      rating: 5,
      comment: 'Very professional! Replaced my phone screen in 30 minutes flat.',
    });

    // V2 additions
    await seedV2Data();

    console.log('Database seeding successfully finished.');
    console.log('Demo Credentials:');
    console.log('  Customer: customer@example.com / password123');
    console.log('  Repairer: repairer@example.com / password123');
    console.log('  QuickFix (Repairer): quickfix@example.com / password123');
    console.log('  Admin: admin@example.com / password123');
    
  } catch (error) {
    console.error('Error during database seed execution:', error);
    process.exit(1);
  }
};

// If executing this file directly (e.g. via npm run seed)
if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.disconnect();
  });
}


// V2 SEED DATA — Recovery Partners, Material Rates, Demo Offers
// Run after existing seed logic
export const seedV2Data = async () => {
  const bcrypt = require('bcryptjs');
  const mongoose = require('mongoose');

  // Import models
  const { MaterialRate } = require('../models/MaterialRate');
  const { RecoveryPartner } = require('../models/RecoveryPartner');
  const { RecoveryOffer } = require('../models/RecoveryOffer');
  const { User } = require('../models/User');

  // Clear
  await MaterialRate.deleteMany({});
  await RecoveryPartner.deleteMany({ isDemoData: true });

  // Seed MaterialRate demo data
  await MaterialRate.insertMany([
    { material: 'Copper-bearing components (coil/wiring)', category: 'Metal', ratePerKg: 450, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Aluminium (fins/chassis)', category: 'Metal', ratePerKg: 135, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Steel / Ferrous metal', category: 'Metal', ratePerKg: 40, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Electronics (PCB/boards)', category: 'Electronics', ratePerKg: 100, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Plastics (mixed)', category: 'Plastic', ratePerKg: 12, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Lithium battery (special handling)', category: 'Battery', ratePerKg: 65, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
    { material: 'Lead-acid battery', category: 'Battery', ratePerKg: 10, currency: 'INR', location: 'Bangalore, India', sourceType: 'DEMO', isDemoData: true, effectiveFrom: new Date() },
  ]);
  console.log('MaterialRates seeded');

  // Create demo recovery partner users
  const hash = await bcrypt.hash('password123', 10);
  const partnerEmails = [
    { email: 'demorecycler@example.com', name: 'Demo Recycler A', type: 'RECYCLER', loc: [77.585, 12.965] },
    { email: 'demorefurbisher@example.com', name: 'Demo Refurbisher B', type: 'REFURBISHER', loc: [77.600, 12.980] },
    { email: 'demoscrap@example.com', name: 'Demo Recovery Buyer C', type: 'SCRAP_BUYER', loc: [77.570, 12.950] },
  ];

  for (const p of partnerEmails) {
    let user = await User.findOne({ email: p.email });
    if (!user) {
      user = await User.create({ name: p.name, email: p.email, passwordHash: hash, role: 'RECOVERY_PARTNER' });
    }
    const existing = await RecoveryPartner.findOne({ userId: user._id });
    if (!existing) {
      await RecoveryPartner.create({
        userId: user._id,
        businessName: p.name,
        partnerType: p.type,
        verificationStatus: 'VERIFIED',
        location: { type: 'Point', coordinates: p.loc },
        serviceRadius: 100,
        serviceCategories: ['Laptop', 'Air Conditioner', 'Ceiling Fan', 'Washing Machine', 'Refrigerator', 'Smartphone'],
        description: `${p.name} — DEMO partner for RepairConnect hackathon demonstration.`,
        contactEmail: p.email,
        isDemoData: true,
      });
    }
  }
  console.log('Recovery partners seeded');
};
