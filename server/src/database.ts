import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kalkyle';

// Koble til MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Koblet til MongoDB'))
  .catch((err) => console.error('MongoDB tilkoblingsfeil:', err));

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
export async function seedCategories() {
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

export default mongoose;
