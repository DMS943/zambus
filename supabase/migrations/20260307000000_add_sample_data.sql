-- Sample Data for ZamBus Application
-- This migration adds realistic sample data for testing and demonstration

-- First, let's get or create a sample operator
DO $$
DECLARE
  sample_operator_id UUID;
  sample_user_id UUID;
  lusaka_ndola_route_id UUID;
  lusaka_livingstone_route_id UUID;
  kitwe_solwezi_route_id UUID;
  bus1_id UUID;
  bus2_id UUID;
  bus3_id UUID;
  bus4_id UUID;
  schedule1_id UUID;
  schedule2_id UUID;
  schedule3_id UUID;
  schedule4_id UUID;
  driver1_id UUID;
  driver2_id UUID;
  driver3_id UUID;
BEGIN
  -- Create a sample bus operator
  INSERT INTO bus_operators (name, contact_email, contact_phone, license_number, is_active)
  VALUES ('Zambia Express Transport', 'info@zambiaexpress.zm', '+260 977 123456', 'ZM-OP-2024-001', true)
  ON CONFLICT (license_number) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO sample_operator_id;

  -- Create sample routes
  INSERT INTO routes (origin, destination, distance_km, estimated_duration_hours, base_price_zmw, is_active)
  VALUES 
    ('Lusaka', 'Ndola', 320, 4.5, 15000, true),
    ('Lusaka', 'Livingstone', 470, 6.0, 20000, true),
    ('Kitwe', 'Solwezi', 250, 3.5, 12000, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO lusaka_ndola_route_id;

  -- Get route IDs
  SELECT id INTO lusaka_ndola_route_id FROM routes WHERE origin = 'Lusaka' AND destination = 'Ndola' LIMIT 1;
  SELECT id INTO lusaka_livingstone_route_id FROM routes WHERE origin = 'Lusaka' AND destination = 'Livingstone' LIMIT 1;
  SELECT id INTO kitwe_solwezi_route_id FROM routes WHERE origin = 'Kitwe' AND destination = 'Solwezi' LIMIT 1;

  -- Create sample buses
  INSERT INTO buses (license_plate, bus_class, total_seats, amenities, operator_id, status)
  VALUES 
    ('PWR001Z', 'luxury', 55, ARRAY['wifi', 'ac', 'entertainment', 'charging', 'refreshments'], sample_operator_id, 'active'),
    ('PWR002Z', 'economy', 60, ARRAY['ac', 'charging'], sample_operator_id, 'active'),
    ('PWR003Z', 'luxury', 50, ARRAY['wifi', 'ac', 'entertainment', 'charging'], sample_operator_id, 'active'),
    ('PWR004Z', 'economy', 55, ARRAY['ac'], sample_operator_id, 'maintenance')
  ON CONFLICT (license_plate) DO UPDATE SET status = EXCLUDED.status
  RETURNING id INTO bus1_id;

  -- Get bus IDs
  SELECT id INTO bus1_id FROM buses WHERE license_plate = 'PWR001Z' LIMIT 1;
  SELECT id INTO bus2_id FROM buses WHERE license_plate = 'PWR002Z' LIMIT 1;
  SELECT id INTO bus3_id FROM buses WHERE license_plate = 'PWR003Z' LIMIT 1;
  SELECT id INTO bus4_id FROM buses WHERE license_plate = 'PWR004Z' LIMIT 1;

  -- Create sample schedules
  INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, price_zmw, available_dates, is_active)
  VALUES 
    (lusaka_ndola_route_id, bus1_id, '06:00:00', '10:30:00', 18000, 
     ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6], true),
    (lusaka_ndola_route_id, bus2_id, '14:00:00', '18:30:00', 15000,
     ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6], true),
    (lusaka_livingstone_route_id, bus3_id, '07:00:00', '13:00:00', 25000,
     ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6], true),
    (kitwe_solwezi_route_id, bus2_id, '09:00:00', '12:30:00', 14000,
     ARRAY[CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 2, CURRENT_DATE + 3, CURRENT_DATE + 4, CURRENT_DATE + 5, CURRENT_DATE + 6], true)
  ON CONFLICT DO NOTHING;

  -- Get schedule IDs
  SELECT id INTO schedule1_id FROM schedules WHERE route_id = lusaka_ndola_route_id AND departure_time = '06:00:00' LIMIT 1;
  SELECT id INTO schedule2_id FROM schedules WHERE route_id = lusaka_ndola_route_id AND departure_time = '14:00:00' LIMIT 1;
  SELECT id INTO schedule3_id FROM schedules WHERE route_id = lusaka_livingstone_route_id LIMIT 1;
  SELECT id INTO schedule4_id FROM schedules WHERE route_id = kitwe_solwezi_route_id LIMIT 1;

  -- Create sample user for bookings
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'john.mwale@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;

  SELECT id INTO sample_user_id FROM auth.users WHERE email = 'john.mwale@example.com' LIMIT 1;

  -- Create profile for sample user
  INSERT INTO profiles (id, first_name, last_name, phone, preferred_language)
  VALUES (sample_user_id, 'John', 'Mwale', '+260 977 654321', 'english')
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name;

  -- Create sample bookings
  INSERT INTO bookings (
    user_id, schedule_id, booking_date, total_passengers, 
    total_price_zmw, status, payment_method, payment_status,
    contact_phone, contact_email, booking_reference
  )
  VALUES 
    (sample_user_id, schedule1_id, CURRENT_DATE, 2, 36000, 'confirmed', 'mobile_money', 'completed', '+260 977 654321', 'john.mwale@example.com', 'ZB-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')),
    (sample_user_id, schedule2_id, CURRENT_DATE + 1, 1, 15000, 'confirmed', 'mobile_money', 'completed', '+260 977 654321', 'john.mwale@example.com', 'ZB-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')),
    (sample_user_id, schedule3_id, CURRENT_DATE + 2, 3, 75000, 'pending', 'mobile_money', 'pending', '+260 977 654321', 'john.mwale@example.com', 'ZB-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'))
  ON CONFLICT DO NOTHING;

  -- Add passengers for bookings
  INSERT INTO passengers (booking_id, first_name, last_name, id_number, seat_number)
  SELECT 
    b.id,
    'Passenger',
    'One',
    'ID' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    'A' || FLOOR(RANDOM() * 20 + 1)::TEXT
  FROM bookings b
  WHERE b.booking_reference LIKE 'ZB-%'
  ON CONFLICT DO NOTHING;

  -- Create sample drivers (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers') THEN
    INSERT INTO drivers (operator_id, first_name, last_name, license_number, phone, status)
    VALUES 
      (sample_operator_id, 'Moses', 'Banda', 'DL-2024-001', '+260 977 111222', 'active'),
      (sample_operator_id, 'Grace', 'Phiri', 'DL-2024-002', '+260 977 333444', 'active'),
      (sample_operator_id, 'Patrick', 'Mulenga', 'DL-2024-003', '+260 977 555666', 'on_leave')
    ON CONFLICT (license_number) DO NOTHING;
  END IF;

  -- Create sample maintenance records (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    INSERT INTO maintenance_records (bus_id, maintenance_type, description, cost_zmw, scheduled_date, status)
    VALUES 
      (bus4_id, 'routine', 'Regular service and oil change', 250000, CURRENT_DATE, 'in_progress'),
      (bus1_id, 'repair', 'Brake pad replacement', 180000, CURRENT_DATE - 7, 'completed'),
      (bus2_id, 'inspection', 'Annual safety inspection', 150000, CURRENT_DATE + 30, 'scheduled')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create sample notifications (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'operator_notifications') THEN
    INSERT INTO operator_notifications (operator_id, title, message, type, priority)
    VALUES 
      (sample_operator_id, 'Maintenance Due', 'Bus PWR001Z is due for routine maintenance in 5 days', 'maintenance', 'medium'),
      (sample_operator_id, 'High Booking Volume', 'Lusaka-Ndola route has 85% occupancy for tomorrow', 'booking', 'high'),
      (sample_operator_id, 'Driver License Expiry', 'Driver Moses Banda license expires in 30 days', 'driver', 'medium')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create sample financial records (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
    INSERT INTO financial_transactions (operator_id, booking_id, amount_zmw, transaction_type, payment_method, status)
    SELECT 
      sample_operator_id,
      b.id,
      b.total_price_zmw,
      'booking_payment',
      b.payment_method,
      'completed'
    FROM bookings b
    WHERE b.status = 'confirmed'
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Sample data created successfully!';
  RAISE NOTICE 'Operator ID: %', sample_operator_id;
  RAISE NOTICE 'Routes created: 3';
  RAISE NOTICE 'Buses created: 4';
  RAISE NOTICE 'Schedules created: 4';
  RAISE NOTICE 'Bookings created: 3';
END $$;

-- Add some travel updates
INSERT INTO travel_updates (title, description, type, priority, icon_color, is_active)
VALUES 
  ('Road Construction Alert', 'Temporary delays expected on Lusaka-Ndola route due to road works near Kabwe', 'delay', 'high', 'bg-amber-500', true),
  ('New Route Available', 'We now offer direct service from Kitwe to Solwezi with luxury buses', 'announcement', 'medium', 'bg-blue-500', true),
  ('Holiday Special Offer', 'Book 3 tickets and get 10% discount on all routes this weekend', 'promotion', 'medium', 'bg-green-500', true)
ON CONFLICT DO NOTHING;

-- Update statistics
COMMENT ON EXTENSION IF EXISTS pg_stat_statements IS 'Sample data loaded for ZamBus application';
