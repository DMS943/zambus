-- Quick Sample Data Script for ZamBus
-- Run this in Supabase SQL Editor to populate your database

-- 1. Create a sample bus operator
INSERT INTO bus_operators (name, contact_email, contact_phone, is_active)
VALUES ('Zambia Express Transport', 'info@zambiaexpress.zm', '+260 977 123456', true)
ON CONFLICT DO NOTHING;

-- 2. Create sample routes
INSERT INTO routes (origin, destination, distance_km, estimated_duration_hours, is_active)
VALUES 
  ('Lusaka', 'Ndola', 320, 4.5, true),
  ('Lusaka', 'Livingstone', 470, 6.0, true),
  ('Kitwe', 'Solwezi', 250, 3.5, true),
  ('Lusaka', 'Chipata', 580, 8.0, true),
  ('Ndola', 'Kitwe', 50, 1.0, true)
ON CONFLICT DO NOTHING;

-- 3. Create sample buses
INSERT INTO buses (license_plate, bus_class, total_seats, amenities, operator_id, is_active)
SELECT 
  'PWR001Z', 'luxury', 55, ARRAY['wifi', 'ac', 'entertainment', 'charging', 'refreshments'], 
  (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = 'PWR001Z');

INSERT INTO buses (license_plate, bus_class, total_seats, amenities, operator_id, is_active)
SELECT 
  'PWR002Z', 'economy', 60, ARRAY['ac', 'charging'], 
  (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = 'PWR002Z');

INSERT INTO buses (license_plate, bus_class, total_seats, amenities, operator_id, is_active)
SELECT 
  'PWR003Z', 'luxury', 50, ARRAY['wifi', 'ac', 'entertainment', 'charging'], 
  (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = 'PWR003Z');

INSERT INTO buses (license_plate, bus_class, total_seats, amenities, operator_id, is_active)
SELECT 
  'PWR004Z', 'economy', 55, ARRAY['ac'], 
  (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1), false
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = 'PWR004Z');

-- 4. Create sample schedules
INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, price_zmw, available_dates, is_active)
SELECT 
  (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Ndola' LIMIT 1),
  (SELECT id FROM buses WHERE license_plate = 'PWR001Z'),
  '06:00:00', '10:30:00', 18000,
  ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.route_id = (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Ndola' LIMIT 1)
  AND s.departure_time = '06:00:00'
);

INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, price_zmw, available_dates, is_active)
SELECT 
  (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Ndola' LIMIT 1),
  (SELECT id FROM buses WHERE license_plate = 'PWR002Z'),
  '14:00:00', '18:30:00', 15000,
  ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.route_id = (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Ndola' LIMIT 1)
  AND s.departure_time = '14:00:00'
);

INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, price_zmw, available_dates, is_active)
SELECT 
  (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Livingstone' LIMIT 1),
  (SELECT id FROM buses WHERE license_plate = 'PWR003Z'),
  '07:00:00', '13:00:00', 25000,
  ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.route_id = (SELECT id FROM routes WHERE origin = 'Lusaka' AND destination = 'Livingstone' LIMIT 1)
  AND s.departure_time = '07:00:00'
);

INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, price_zmw, available_dates, is_active)
SELECT 
  (SELECT id FROM routes WHERE origin = 'Kitwe' AND destination = 'Solwezi' LIMIT 1),
  (SELECT id FROM buses WHERE license_plate = 'PWR002Z'),
  '09:00:00', '12:30:00', 14000,
  ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6],
  true
WHERE NOT EXISTS (
  SELECT 1 FROM schedules s 
  WHERE s.route_id = (SELECT id FROM routes WHERE origin = 'Kitwe' AND destination = 'Solwezi' LIMIT 1)
  AND s.departure_time = '09:00:00'
);

-- 5. Add travel updates (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_updates') THEN
    -- Check if priority is integer or text
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'travel_updates' 
      AND column_name = 'priority' 
      AND data_type = 'integer'
    ) THEN
      -- Priority is integer (1=low, 2=medium, 3=high)
      INSERT INTO travel_updates (title, description, type, priority, icon_color, is_active)
      VALUES 
        ('Road Construction Alert', 'Temporary delays expected on Lusaka-Ndola route due to road works near Kabwe', 'delay', 3, 'bg-amber-500', true),
        ('New Route Available', 'We now offer direct service from Kitwe to Solwezi with luxury buses', 'announcement', 2, 'bg-blue-500', true),
        ('Holiday Special Offer', 'Book 3 tickets and get 10% discount on all routes this weekend', 'promotion', 2, 'bg-green-500', true)
      ON CONFLICT DO NOTHING;
    ELSE
      -- Priority is text
      INSERT INTO travel_updates (title, description, type, priority, icon_color, is_active)
      VALUES 
        ('Road Construction Alert', 'Temporary delays expected on Lusaka-Ndola route due to road works near Kabwe', 'delay', 'high', 'bg-amber-500', true),
        ('New Route Available', 'We now offer direct service from Kitwe to Solwezi with luxury buses', 'announcement', 'medium', 'bg-blue-500', true),
        ('Holiday Special Offer', 'Book 3 tickets and get 10% discount on all routes this weekend', 'promotion', 'medium', 'bg-green-500', true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- 6. Add sample drivers (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drivers') THEN
    INSERT INTO drivers (operator_id, first_name, last_name, license_number, phone, status)
    SELECT 
      (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1),
      'Moses', 'Banda', 'DL-2024-001', '+260 977 111222', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE license_number = 'DL-2024-001');

    INSERT INTO drivers (operator_id, first_name, last_name, license_number, phone, status)
    SELECT 
      (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1),
      'Grace', 'Phiri', 'DL-2024-002', '+260 977 333444', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE license_number = 'DL-2024-002');

    INSERT INTO drivers (operator_id, first_name, last_name, license_number, phone, status)
    SELECT 
      (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1),
      'Patrick', 'Mulenga', 'DL-2024-003', '+260 977 555666', 'on_leave'
    WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE license_number = 'DL-2024-003');
  END IF;
END $$;

-- 7. Add sample maintenance records (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_records') THEN
    INSERT INTO maintenance_records (bus_id, maintenance_type, description, cost_zmw, scheduled_date, status)
    SELECT 
      (SELECT id FROM buses WHERE license_plate = 'PWR004Z'),
      'routine', 'Regular service and oil change', 250000, CURRENT_DATE, 'in_progress'
    WHERE NOT EXISTS (
      SELECT 1 FROM maintenance_records 
      WHERE bus_id = (SELECT id FROM buses WHERE license_plate = 'PWR004Z')
      AND scheduled_date = CURRENT_DATE
    );

    INSERT INTO maintenance_records (bus_id, maintenance_type, description, cost_zmw, scheduled_date, status)
    SELECT 
      (SELECT id FROM buses WHERE license_plate = 'PWR001Z'),
      'repair', 'Brake pad replacement', 180000, CURRENT_DATE - 7, 'completed'
    WHERE NOT EXISTS (
      SELECT 1 FROM maintenance_records 
      WHERE bus_id = (SELECT id FROM buses WHERE license_plate = 'PWR001Z')
      AND scheduled_date = CURRENT_DATE - 7
    );
  END IF;
END $$;

-- 8. Add sample notifications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'operator_notifications') THEN
    INSERT INTO operator_notifications (operator_id, title, message, type, priority)
    SELECT 
      (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1),
      'Maintenance Due', 'Bus PWR001Z is due for routine maintenance in 5 days', 'maintenance', 'medium'
    WHERE NOT EXISTS (
      SELECT 1 FROM operator_notifications 
      WHERE title = 'Maintenance Due'
    );

    INSERT INTO operator_notifications (operator_id, title, message, type, priority)
    SELECT 
      (SELECT id FROM bus_operators WHERE name = 'Zambia Express Transport' LIMIT 1),
      'High Booking Volume', 'Lusaka-Ndola route has 85% occupancy for tomorrow', 'booking', 'high'
    WHERE NOT EXISTS (
      SELECT 1 FROM operator_notifications 
      WHERE title = 'High Booking Volume'
    );
  END IF;
END $$;

-- Success message
SELECT 'Sample data added successfully!' as status,
       (SELECT COUNT(*) FROM buses) as total_buses,
       (SELECT COUNT(*) FROM routes) as total_routes,
       (SELECT COUNT(*) FROM schedules) as total_schedules;
