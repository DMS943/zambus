
-- Clear existing sample data
DELETE FROM public.schedules;
DELETE FROM public.buses;
DELETE FROM public.routes;
DELETE FROM public.bus_operators;

-- Insert real Zambian bus operators
INSERT INTO public.bus_operators (name, contact_phone, contact_email) VALUES
  ('Mazhandu Family Bus Services', '+260211123456', 'info@mazhandu.zm'),
  ('Shalom Bus Services', '+260977234567', 'bookings@shalombus.zm'),
  ('Power Tools Bus Services', '+260966345678', 'contact@powertools.zm'),
  ('Likili Motorways', '+260955456789', 'info@likili.zm'),
  ('Euro-Africa Bus Services', '+260211567890', 'bookings@euroafrica.zm'),
  ('Johabie Transport', '+260977678901', 'info@johabie.zm'),
  ('Zambia-Malawi Bus Service', '+260966789012', 'contact@zambiamalawi.zm'),
  ('Marcopolo Bus Services', '+260955890123', 'info@marcopolo.zm'),
  ('MB Transport', '+260977901234', 'bookings@mbtransport.zm'),
  ('The Post Bus (Zampost)', '+260211012345', 'postbus@zampost.zm');

-- Insert real Zambian routes
INSERT INTO public.routes (origin, destination, distance_km, estimated_duration_hours) VALUES
  ('Lusaka', 'Ndola', 316, 5.5),
  ('Lusaka', 'Kitwe', 360, 6.0),
  ('Lusaka', 'Livingstone', 480, 7.0),
  ('Lusaka', 'Mongu', 590, 8.5),
  ('Lusaka', 'Kasama', 850, 12.0),
  ('Lusaka', 'Nakonde', 1000, 14.0),
  ('Lusaka', 'Chipata', 570, 8.0),
  ('Lusaka', 'Solwezi', 560, 8.0),
  ('Ndola', 'Kitwe', 62, 1.5),
  ('Kitwe', 'Kasumbalesa', 100, 2.0),
  ('Livingstone', 'Kazungula', 70, 1.5),
  ('Lusaka', 'Harare', 480, 8.0),
  ('Lusaka', 'Lilongwe', 570, 9.0),
  ('Lusaka', 'Kabwe', 150, 2.5),
  ('Kitwe', 'Chingola', 45, 1.0),
  ('Ndola', 'Mufulira', 80, 1.5);

-- Insert buses for each operator with realistic fleet sizes
INSERT INTO public.buses (operator_id, license_plate, bus_class, total_seats, amenities) VALUES
  -- Mazhandu Family Bus Services (Luxury focus)
  ((SELECT id FROM public.bus_operators WHERE name = 'Mazhandu Family Bus Services'), 'MAZ001Z', 'luxury', 45, ARRAY['WiFi', 'AC', 'Reclining Seats', 'Entertainment']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Mazhandu Family Bus Services'), 'MAZ002Z', 'luxury', 45, ARRAY['WiFi', 'AC', 'Reclining Seats']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Mazhandu Family Bus Services'), 'MAZ003Z', 'vip', 35, ARRAY['WiFi', 'AC', 'Entertainment', 'Meals', 'USB Charging']),
  
  -- Shalom Bus Services (Reliable routes)
  ((SELECT id FROM public.bus_operators WHERE name = 'Shalom Bus Services'), 'SHM001Z', 'economy', 50, ARRAY['AC']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Shalom Bus Services'), 'SHM002Z', 'luxury', 42, ARRAY['WiFi', 'AC', 'Reclining Seats']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Shalom Bus Services'), 'SHM003Z', 'economy', 50, ARRAY['AC']),
  
  -- Power Tools Bus Services (Affordable)
  ((SELECT id FROM public.bus_operators WHERE name = 'Power Tools Bus Services'), 'PWR001Z', 'economy', 55, ARRAY['AC']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Power Tools Bus Services'), 'PWR002Z', 'economy', 55, ARRAY[]::text[]),
  ((SELECT id FROM public.bus_operators WHERE name = 'Power Tools Bus Services'), 'PWR003Z', 'luxury', 45, ARRAY['AC', 'Reclining Seats']),
  
  -- Likili Motorways (Western Province)
  ((SELECT id FROM public.bus_operators WHERE name = 'Likili Motorways'), 'LIK001Z', 'economy', 48, ARRAY['AC']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Likili Motorways'), 'LIK002Z', 'luxury', 40, ARRAY['WiFi', 'AC', 'Reclining Seats']),
  
  -- Euro-Africa Bus Services (Cross-border)
  ((SELECT id FROM public.bus_operators WHERE name = 'Euro-Africa Bus Services'), 'EUR001Z', 'luxury', 45, ARRAY['WiFi', 'AC', 'Entertainment', 'Reclining Seats']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Euro-Africa Bus Services'), 'EUR002Z', 'vip', 30, ARRAY['WiFi', 'AC', 'Entertainment', 'Meals', 'USB Charging']),
  
  -- Johabie Transport (Southern Province)
  ((SELECT id FROM public.bus_operators WHERE name = 'Johabie Transport'), 'JOH001Z', 'economy', 50, ARRAY['AC']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Johabie Transport'), 'JOH002Z', 'luxury', 42, ARRAY['WiFi', 'AC', 'Reclining Seats']),
  
  -- Zambia-Malawi Bus Service (Cross-border)
  ((SELECT id FROM public.bus_operators WHERE name = 'Zambia-Malawi Bus Service'), 'ZAM001Z', 'luxury', 45, ARRAY['WiFi', 'AC', 'Reclining Seats']),
  
  -- Marcopolo Bus Services (Modern fleet)
  ((SELECT id FROM public.bus_operators WHERE name = 'Marcopolo Bus Services'), 'MAR001Z', 'vip', 35, ARRAY['WiFi', 'AC', 'Entertainment', 'USB Charging', 'Reclining Seats']),
  ((SELECT id FROM public.bus_operators WHERE name = 'Marcopolo Bus Services'), 'MAR002Z', 'luxury', 40, ARRAY['WiFi', 'AC', 'Reclining Seats', 'USB Charging']),
  
  -- MB Transport (Regional)
  ((SELECT id FROM public.bus_operators WHERE name = 'MB Transport'), 'MBT001Z', 'economy', 50, ARRAY['AC']),
  ((SELECT id FROM public.bus_operators WHERE name = 'MB Transport'), 'MBT002Z', 'economy', 50, ARRAY[]::text[]),
  
  -- The Post Bus (Affordable nationwide)
  ((SELECT id FROM public.bus_operators WHERE name = 'The Post Bus (Zampost)'), 'PST001Z', 'economy', 55, ARRAY[]::text[]),
  ((SELECT id FROM public.bus_operators WHERE name = 'The Post Bus (Zampost)'), 'PST002Z', 'economy', 55, ARRAY['AC']);

-- Insert realistic schedules for popular routes
INSERT INTO public.schedules (bus_id, route_id, departure_time, arrival_time, price_zmw, available_dates) VALUES
  -- Lusaka → Ndola (Very popular route)
  ((SELECT id FROM public.buses WHERE license_plate = 'MAZ001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Ndola'), '06:00:00', '11:30:00', 45000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'SHM001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Ndola'), '07:30:00', '13:00:00', 35000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'PWR001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Ndola'), '14:00:00', '19:30:00', 25000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  
  -- Lusaka → Kitwe (Business route)
  ((SELECT id FROM public.buses WHERE license_plate = 'MAZ002Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Kitwe'), '05:30:00', '11:30:00', 50000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'SHM002Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Kitwe'), '08:00:00', '14:00:00', 42000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'PWR002Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Kitwe'), '16:00:00', '22:00:00', 30000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  
  -- Lusaka → Livingstone (Tourism route)
  ((SELECT id FROM public.buses WHERE license_plate = 'MAZ003Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Livingstone'), '06:00:00', '13:00:00', 80000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'JOH001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Livingstone'), '21:00:00', '04:00:00', 55000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  
  -- Lusaka → Mongu (Western Province)
  ((SELECT id FROM public.buses WHERE license_plate = 'LIK001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Mongu'), '20:00:00', '04:30:00', 75000, ARRAY[CURRENT_DATE + 1, CURRENT_DATE + 3, CURRENT_DATE + 5]),
  ((SELECT id FROM public.buses WHERE license_plate = 'LIK002Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Mongu'), '19:30:00', '04:00:00', 85000, ARRAY[CURRENT_DATE + 2, CURRENT_DATE + 4, CURRENT_DATE + 6]),
  
  -- Lusaka → Chipata (Eastern Province, link to Malawi)
  ((SELECT id FROM public.buses WHERE license_plate = 'ZAM001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Chipata'), '19:00:00', '03:00:00', 70000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  
  -- Cross-border routes
  ((SELECT id FROM public.buses WHERE license_plate = 'EUR001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Harare'), '18:00:00', '02:00:00', 120000, ARRAY[CURRENT_DATE + 1, CURRENT_DATE + 3, CURRENT_DATE + 5]),
  ((SELECT id FROM public.buses WHERE license_plate = 'ZAM001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Lilongwe'), '17:00:00', '02:00:00', 95000, ARRAY[CURRENT_DATE + 2, CURRENT_DATE + 4, CURRENT_DATE + 6]),
  
  -- Short routes
  ((SELECT id FROM public.buses WHERE license_plate = 'SHM003Z'), (SELECT id FROM public.routes WHERE origin = 'Ndola' AND destination = 'Kitwe'), '06:00:00', '07:30:00', 15000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'MBT001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Kabwe'), '07:00:00', '09:30:00', 20000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  
  -- Additional schedules for high-demand routes
  ((SELECT id FROM public.buses WHERE license_plate = 'PST001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Ndola'), '12:00:00', '17:30:00', 22000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]),
  ((SELECT id FROM public.buses WHERE license_plate = 'MAR001Z'), (SELECT id FROM public.routes WHERE origin = 'Lusaka' AND destination = 'Kitwe'), '20:00:00', '02:00:00', 65000, ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6]);
