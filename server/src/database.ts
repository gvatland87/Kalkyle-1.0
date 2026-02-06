import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kalkyle';

// === SCHEMAS ===

// Bruker
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Kostnadskategori (global)
const costCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['labor', 'material', 'consumable', 'transport', 'ndt'], required: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Kostnadspost (global)
const costItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostCategory', required: true },
  name: { type: String, required: true },
  description: { type: String },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Kalkyle
const calculationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  targetMarginPercent: { type: Number, default: 15 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Kalkyle-linje
const calculationLineSchema = new mongoose.Schema({
  calculationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Calculation', required: true },
  costItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CostItem' },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// === MODELS ===
export const User = mongoose.model('User', userSchema);
export const CostCategory = mongoose.model('CostCategory', costCategorySchema);
export const CostItem = mongoose.model('CostItem', costItemSchema);
export const Calculation = mongoose.model('Calculation', calculationSchema);
export const CalculationLine = mongoose.model('CalculationLine', calculationLineSchema);

// Seed standard kategorier hvis de ikke finnes
async function seedCategories() {
  const count = await CostCategory.countDocuments();
  if (count === 0) {
    await CostCategory.insertMany([
      { name: 'Arbeid', type: 'labor', sortOrder: 1 },
      { name: 'Materialer', type: 'material', sortOrder: 2 },
      { name: 'Forbruksmateriell', type: 'consumable', sortOrder: 3 },
      { name: 'Transport', type: 'transport', sortOrder: 4 },
      { name: 'NDT', type: 'ndt', sortOrder: 5 }
    ]);
    console.log('Standard kategorier opprettet');
  }
}

// Seed standard kostpriser hvis de ikke finnes
async function seedCostItems() {
  const count = await CostItem.countDocuments();
  if (count === 0) {
    // Hent kategorier
    const categories = await CostCategory.find();
    const categoryMap = new Map(categories.map(c => [c.type, c._id]));

    const laborId = categoryMap.get('labor');
    const materialId = categoryMap.get('material');
    const consumableId = categoryMap.get('consumable');
    const transportId = categoryMap.get('transport');
    const ndtId = categoryMap.get('ndt');

    const costItems = [
      // Arbeid (labor)
      { categoryId: laborId, name: 'Sveiser - TIG', unit: 'timer', unitPrice: 850, sortOrder: 1 },
      { categoryId: laborId, name: 'Sveiser - MIG/MAG', unit: 'timer', unitPrice: 750, sortOrder: 2 },
      { categoryId: laborId, name: 'Sveiser - MMA', unit: 'timer', unitPrice: 700, sortOrder: 3 },
      { categoryId: laborId, name: 'Platearbeider', unit: 'timer', unitPrice: 650, sortOrder: 4 },
      { categoryId: laborId, name: 'Rørlegger', unit: 'timer', unitPrice: 750, sortOrder: 5 },
      { categoryId: laborId, name: 'Montør', unit: 'timer', unitPrice: 650, sortOrder: 6 },
      { categoryId: laborId, name: 'Prosjektleder', unit: 'timer', unitPrice: 1100, sortOrder: 7 },
      { categoryId: laborId, name: 'Ingeniør', unit: 'timer', unitPrice: 1000, sortOrder: 8 },
      { categoryId: laborId, name: 'Tegner/CAD', unit: 'timer', unitPrice: 800, sortOrder: 9 },
      { categoryId: laborId, name: 'Kranfører', unit: 'timer', unitPrice: 750, sortOrder: 10 },
      { categoryId: laborId, name: 'Lærling', unit: 'timer', unitPrice: 450, sortOrder: 11 },

      // Materialer (material)
      { categoryId: materialId, name: 'Stålplate S355 - 5mm', unit: 'kg', unitPrice: 28, sortOrder: 1 },
      { categoryId: materialId, name: 'Stålplate S355 - 10mm', unit: 'kg', unitPrice: 26, sortOrder: 2 },
      { categoryId: materialId, name: 'Stålplate S355 - 15mm', unit: 'kg', unitPrice: 25, sortOrder: 3 },
      { categoryId: materialId, name: 'Stålplate S355 - 20mm', unit: 'kg', unitPrice: 24, sortOrder: 4 },
      { categoryId: materialId, name: 'Rustfritt stål 316L - 3mm', unit: 'kg', unitPrice: 85, sortOrder: 5 },
      { categoryId: materialId, name: 'Rustfritt stål 316L - 5mm', unit: 'kg', unitPrice: 82, sortOrder: 6 },
      { categoryId: materialId, name: 'HEA 100', unit: 'meter', unitPrice: 450, sortOrder: 7 },
      { categoryId: materialId, name: 'HEA 200', unit: 'meter', unitPrice: 850, sortOrder: 8 },
      { categoryId: materialId, name: 'HEB 100', unit: 'meter', unitPrice: 520, sortOrder: 9 },
      { categoryId: materialId, name: 'HEB 200', unit: 'meter', unitPrice: 1050, sortOrder: 10 },
      { categoryId: materialId, name: 'IPE 100', unit: 'meter', unitPrice: 280, sortOrder: 11 },
      { categoryId: materialId, name: 'IPE 200', unit: 'meter', unitPrice: 520, sortOrder: 12 },
      { categoryId: materialId, name: 'Rør Ø50x3 S355', unit: 'meter', unitPrice: 180, sortOrder: 13 },
      { categoryId: materialId, name: 'Rør Ø100x5 S355', unit: 'meter', unitPrice: 420, sortOrder: 14 },
      { categoryId: materialId, name: 'Rør Ø50x3 316L', unit: 'meter', unitPrice: 650, sortOrder: 15 },
      { categoryId: materialId, name: 'Flattstål 50x5', unit: 'meter', unitPrice: 45, sortOrder: 16 },
      { categoryId: materialId, name: 'Flattstål 100x10', unit: 'meter', unitPrice: 180, sortOrder: 17 },
      { categoryId: materialId, name: 'Vinkelstål 50x50x5', unit: 'meter', unitPrice: 85, sortOrder: 18 },
      { categoryId: materialId, name: 'Vinkelstål 100x100x10', unit: 'meter', unitPrice: 320, sortOrder: 19 },
      { categoryId: materialId, name: 'U-profil 100', unit: 'meter', unitPrice: 280, sortOrder: 20 },

      // Forbruksmateriell (consumable)
      { categoryId: consumableId, name: 'Sveiseelektrode OK 48.00 Ø3.2', unit: 'kg', unitPrice: 85, sortOrder: 1 },
      { categoryId: consumableId, name: 'MIG-tråd SG2 Ø1.0', unit: 'kg', unitPrice: 45, sortOrder: 2 },
      { categoryId: consumableId, name: 'MIG-tråd SG2 Ø1.2', unit: 'kg', unitPrice: 45, sortOrder: 3 },
      { categoryId: consumableId, name: 'TIG-tråd 316L Ø2.0', unit: 'kg', unitPrice: 280, sortOrder: 4 },
      { categoryId: consumableId, name: 'Argon gass', unit: 'liter', unitPrice: 35, sortOrder: 5 },
      { categoryId: consumableId, name: 'CO2/Argon blandegass', unit: 'liter', unitPrice: 28, sortOrder: 6 },
      { categoryId: consumableId, name: 'Slipeskive Ø125', unit: 'stk', unitPrice: 35, sortOrder: 7 },
      { categoryId: consumableId, name: 'Kutteskive Ø125', unit: 'stk', unitPrice: 25, sortOrder: 8 },
      { categoryId: consumableId, name: 'Lamellskive Ø125', unit: 'stk', unitPrice: 55, sortOrder: 9 },
      { categoryId: consumableId, name: 'Stålbørste', unit: 'stk', unitPrice: 85, sortOrder: 10 },
      { categoryId: consumableId, name: 'Boremaskin HSS Ø10', unit: 'stk', unitPrice: 120, sortOrder: 11 },
      { categoryId: consumableId, name: 'Spraymaling grå', unit: 'boks', unitPrice: 95, sortOrder: 12 },
      { categoryId: consumableId, name: 'Primer', unit: 'liter', unitPrice: 180, sortOrder: 13 },
      { categoryId: consumableId, name: 'Epoxy maling', unit: 'liter', unitPrice: 450, sortOrder: 14 },

      // Transport (transport)
      { categoryId: transportId, name: 'Varebil m/henger', unit: 'km', unitPrice: 18, sortOrder: 1 },
      { categoryId: transportId, name: 'Lastebil', unit: 'km', unitPrice: 35, sortOrder: 2 },
      { categoryId: transportId, name: 'Spesialtransport', unit: 'km', unitPrice: 85, sortOrder: 3 },
      { categoryId: transportId, name: 'Rigg/avrigg lite prosjekt', unit: 'stk', unitPrice: 8500, sortOrder: 4 },
      { categoryId: transportId, name: 'Rigg/avrigg stort prosjekt', unit: 'stk', unitPrice: 25000, sortOrder: 5 },
      { categoryId: transportId, name: 'Mobilkran 25t', unit: 'dag', unitPrice: 12000, sortOrder: 6 },
      { categoryId: transportId, name: 'Mobilkran 50t', unit: 'dag', unitPrice: 18000, sortOrder: 7 },
      { categoryId: transportId, name: 'Lift/sakselift', unit: 'dag', unitPrice: 1800, sortOrder: 8 },
      { categoryId: transportId, name: 'Stillasleie', unit: 'uke', unitPrice: 3500, sortOrder: 9 },

      // NDT (ndt)
      { categoryId: ndtId, name: 'VT - Visuell kontroll', unit: 'timer', unitPrice: 850, sortOrder: 1 },
      { categoryId: ndtId, name: 'PT - Penetrant', unit: 'timer', unitPrice: 950, sortOrder: 2 },
      { categoryId: ndtId, name: 'MT - Magnetpulver', unit: 'timer', unitPrice: 950, sortOrder: 3 },
      { categoryId: ndtId, name: 'UT - Ultralyd', unit: 'timer', unitPrice: 1100, sortOrder: 4 },
      { categoryId: ndtId, name: 'RT - Røntgen', unit: 'timer', unitPrice: 1400, sortOrder: 5 },
      { categoryId: ndtId, name: 'PMI - Materialverifisering', unit: 'punkt', unitPrice: 350, sortOrder: 6 },
      { categoryId: ndtId, name: 'Hardhetsmåling', unit: 'punkt', unitPrice: 250, sortOrder: 7 },
      { categoryId: ndtId, name: 'Sveisesertifikat (WPS/WPQR)', unit: 'stk', unitPrice: 8500, sortOrder: 8 },
    ];

    await CostItem.insertMany(costItems);
    console.log(`${costItems.length} standard kostpriser opprettet`);
  }
}

// Koble til MongoDB og seed data
export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Koblet til MongoDB');
    await seedCategories();
    await seedCostItems();
  } catch (err) {
    console.error('MongoDB tilkoblingsfeil:', err);
    process.exit(1);
  }
}

export default mongoose;
