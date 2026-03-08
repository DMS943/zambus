
export interface RouteInfo {
  from: string;
  to: string;
  distance: number; // in kilometers
  estimatedTime: string;
}

// Updated with comprehensive Zambian routes from the database
export const routes: RouteInfo[] = [
  // Major routes from Lusaka
  { from: "Lusaka", to: "Ndola", distance: 316, estimatedTime: "5h 30m" },
  { from: "Lusaka", to: "Kitwe", distance: 360, estimatedTime: "6h 00m" },
  { from: "Lusaka", to: "Livingstone", distance: 480, estimatedTime: "7h 00m" },
  { from: "Lusaka", to: "Mongu", distance: 590, estimatedTime: "8h 30m" },
  { from: "Lusaka", to: "Kasama", distance: 850, estimatedTime: "12h 00m" },
  { from: "Lusaka", to: "Nakonde", distance: 1000, estimatedTime: "14h 00m" },
  { from: "Lusaka", to: "Chipata", distance: 570, estimatedTime: "8h 00m" },
  { from: "Lusaka", to: "Solwezi", distance: 560, estimatedTime: "8h 00m" },
  { from: "Lusaka", to: "Kabwe", distance: 150, estimatedTime: "2h 30m" },
  { from: "Lusaka", to: "Luanshya", distance: 320, estimatedTime: "5h 00m" },
  { from: "Lusaka", to: "Mazabuka", distance: 130, estimatedTime: "2h 00m" },
  { from: "Lusaka", to: "Kafue", distance: 50, estimatedTime: "1h 00m" },
  { from: "Lusaka", to: "Choma", distance: 320, estimatedTime: "4h 30m" },
  { from: "Lusaka", to: "Mumbwa", distance: 180, estimatedTime: "3h 00m" },
  { from: "Lusaka", to: "Kapiri Mposhi", distance: 200, estimatedTime: "3h 30m" },
  
  // Copperbelt routes
  { from: "Ndola", to: "Kitwe", distance: 62, estimatedTime: "1h 30m" },
  { from: "Kitwe", to: "Chingola", distance: 45, estimatedTime: "1h 00m" },
  { from: "Ndola", to: "Mufulira", distance: 80, estimatedTime: "1h 30m" },
  { from: "Kitwe", to: "Luanshya", distance: 30, estimatedTime: "45m" },
  { from: "Ndola", to: "Luanshya", distance: 35, estimatedTime: "50m" },
  { from: "Chingola", to: "Mufulira", distance: 25, estimatedTime: "40m" },
  { from: "Kitwe", to: "Kasumbalesa", distance: 100, estimatedTime: "2h 00m" },
  
  // Southern Province routes
  { from: "Livingstone", to: "Kazungula", distance: 70, estimatedTime: "1h 30m" },
  { from: "Livingstone", to: "Choma", distance: 150, estimatedTime: "2h 30m" },
  { from: "Livingstone", to: "Mazabuka", distance: 280, estimatedTime: "4h 00m" },
  { from: "Choma", to: "Mazabuka", distance: 130, estimatedTime: "2h 00m" },
  
  // Western Province routes
  { from: "Mongu", to: "Kaoma", distance: 180, estimatedTime: "3h 00m" },
  { from: "Mongu", to: "Sesheke", distance: 250, estimatedTime: "4h 00m" },
  
  // Northern Province routes
  { from: "Kasama", to: "Mpika", distance: 200, estimatedTime: "3h 30m" },
  { from: "Kasama", to: "Mbala", distance: 150, estimatedTime: "2h 30m" },
  { from: "Mpika", to: "Nakonde", distance: 350, estimatedTime: "5h 00m" },
  
  // Eastern Province routes
  { from: "Chipata", to: "Lundazi", distance: 120, estimatedTime: "2h 00m" },
  { from: "Chipata", to: "Petauke", distance: 180, estimatedTime: "3h 00m" },
  
  // Northwestern routes
  { from: "Solwezi", to: "Mwinilunga", distance: 150, estimatedTime: "3h 00m" },
  { from: "Solwezi", to: "Kansanshi", distance: 15, estimatedTime: "20m" },
  
  // Central Province routes
  { from: "Kabwe", to: "Kapiri Mposhi", distance: 50, estimatedTime: "1h 00m" },
  { from: "Kabwe", to: "Mumbwa", distance: 80, estimatedTime: "1h 30m" },
  
  // Cross-border routes
  { from: "Lusaka", to: "Harare", distance: 480, estimatedTime: "8h 00m" },
  { from: "Lusaka", to: "Lilongwe", distance: 570, estimatedTime: "9h 00m" },
  { from: "Livingstone", to: "Victoria Falls", distance: 20, estimatedTime: "30m" },
  { from: "Chipata", to: "Lilongwe", distance: 200, estimatedTime: "3h 30m" },
  { from: "Nakonde", to: "Mbeya", distance: 150, estimatedTime: "2h 30m" },
];

export const calculatePrice = (from: string, to: string, busType: 'economy' | 'luxury' | 'vip' = 'economy'): number => {
  const route = routes.find(r => 
    (r.from === from && r.to === to) || 
    (r.from === to && r.to === from)
  );
  
  if (!route) return 0;
  
  // Base price per kilometer (adjusted for Zambian market)
  const baseRatePerKm = 0.8; // ZMW per km
  
  // Bus type multipliers (updated to match database enum)
  const multipliers = {
    economy: 1.0,
    luxury: 1.4,
    vip: 1.8
  };
  
  return Math.round(route.distance * baseRatePerKm * multipliers[busType]);
};

export const getLuggagePrice = (bags: number): number => {
  // First bag free, K50 for each additional bag
  return Math.max(0, bags - 1) * 50;
};

export const getLuggagePriceByWeight = (weightPerPassengerKg: number, numberOfPassengers: number): number => {
  // Free allowance: 20kg per passenger
  // Additional weight charged at K5 per kg over the free allowance per passenger
  const freeAllowanceKgPerPassenger = 20;
  const pricePerKg = 5;
  
  // Total free allowance for all passengers
  const totalFreeAllowance = freeAllowanceKgPerPassenger * numberOfPassengers;
  
  // Total weight across all passengers
  const totalWeightKg = weightPerPassengerKg * numberOfPassengers;
  
  // If total weight is within free allowance, no charge
  if (totalWeightKg <= totalFreeAllowance) {
    return 0;
  }
  
  // Calculate excess weight
  const excessWeight = totalWeightKg - totalFreeAllowance;
  
  // Charge K5 per kg of excess weight
  return Math.ceil(excessWeight * pricePerKg);
};

export const formatZMW = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'K0';
  }
  return `K${amount.toLocaleString()}`;
};

// Helper function to format price from database (stored in cents)
export const formatPriceFromCents = (cents: number): string => {
  return `K${(cents / 100).toLocaleString()}`;
};

// Convert ZMW to cents for database storage
export const convertToZMWCents = (zmw: number): number => {
  return Math.round(zmw * 100);
};
