-- Test Script for New Database Functions
-- Run these queries in Supabase SQL Editor to verify everything works

-- ============================================================================
-- 1. TEST SEAT RESERVATION SYSTEM
-- ============================================================================

-- Get available seats for a schedule
SELECT * FROM get_available_seats(
  'YOUR_SCHEDULE_ID_HERE'::UUID,
  '2026-03-10'::DATE
);

-- Reserve some seats
SELECT * FROM reserve_seats(
  'YOUR_SCHEDULE_ID_HERE'::UUID,
  '2026-03-10'::DATE,
  ARRAY['1A', '1B', '2A'],
  'test_session_123',
  NULL -- or user_id
);

-- Check reservations
SELECT * FROM seat_reservations
WHERE schedule_id = 'YOUR_SCHEDULE_ID_HERE'
AND booking_date = '2026-03-10'
ORDER BY created_at DESC;

-- Clean up expired reservations (manual test)
SELECT cleanup_expired_reservations();

-- Release reservations
SELECT release_seat_reservations('test_session_123');

-- ============================================================================
-- 2. TEST RATE LIMITING
-- ============================================================================

-- Check rate limit (should allow first few attempts)
SELECT * FROM check_rate_limit(
  'YOUR_USER_ID_HERE'::UUID,
  '192.168.1.1'::INET,
  'booking_create',
  5, -- max attempts
  60 -- window in minutes
);

-- View rate limits
SELECT * FROM rate_limits
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- Clean up old rate limits
SELECT cleanup_old_rate_limits();

-- ============================================================================
-- 3. TEST AUDIT LOGGING
-- ============================================================================

-- Create a test audit log
SELECT log_audit(
  'YOUR_USER_ID_HERE'::UUID,
  'test_action',
  'test_resource',
  'RESOURCE_ID_HERE'::UUID,
  '{"old": "value"}'::JSONB,
  '{"new": "value"}'::JSONB,
  '{"metadata": "test"}'::JSONB
);

-- View audit logs
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- View booking-related audit logs
SELECT * FROM audit_logs
WHERE resource_type = 'booking'
ORDER BY created_at DESC;

-- ============================================================================
-- 4. TEST INPUT SANITIZATION
-- ============================================================================

-- Test sanitize function
SELECT sanitize_text('<script>alert("xss")</script>Hello World');
-- Should return: "scriptalert(xss)/scriptHello World"

SELECT sanitize_text('Normal text with no issues');
-- Should return: "Normal text with no issues"

-- ============================================================================
-- 5. TEST BOOKING CREATION (FULL TRANSACTION)
-- ============================================================================

-- Create a test booking with passengers
SELECT * FROM create_booking_with_passengers(
  'YOUR_USER_ID_HERE'::UUID,
  'YOUR_SCHEDULE_ID_HERE'::UUID,
  '2026-03-15'::DATE,
  2, -- total passengers
  700.00, -- total price
  '+260971234567', -- contact phone
  'test@example.com', -- contact email
  15.5, -- baggage weight
  1, -- extra luggage count
  'mobile', -- payment method
  '[
    {"firstName": "John", "lastName": "Doe", "seatNumber": "1A", "phone": "+260971234567", "email": "john@example.com"},
    {"firstName": "Jane", "lastName": "Doe", "seatNumber": "1B", "phone": "+260971234568", "email": "jane@example.com"}
  ]'::JSONB,
  'test_session_456'
);

-- Check if booking was created
SELECT * FROM bookings
WHERE booking_reference LIKE 'BK-%'
ORDER BY created_at DESC
LIMIT 1;

-- Check if passengers were created
SELECT b.booking_reference, p.*
FROM bookings b
JOIN passengers p ON p.booking_id = b.id
WHERE b.booking_reference LIKE 'BK-%'
ORDER BY b.created_at DESC;

-- Check if seats were confirmed
SELECT * FROM seat_reservations
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 6. TEST PAYMENT UPDATE
-- ============================================================================

-- Update payment for a booking
SELECT * FROM update_booking_payment(
  'YOUR_BOOKING_ID_HERE'::UUID,
  'PAY_123456789',
  'mobile',
  'YOUR_USER_ID_HERE'::UUID
);

-- Verify booking status changed to confirmed
SELECT id, booking_reference, status, payment_reference
FROM bookings
WHERE id = 'YOUR_BOOKING_ID_HERE';

-- ============================================================================
-- 7. TEST BOOKING CANCELLATION
-- ============================================================================

-- Cancel a booking
SELECT * FROM cancel_booking(
  'YOUR_BOOKING_ID_HERE'::UUID,
  'YOUR_USER_ID_HERE'::UUID,
  'Customer requested cancellation'
);

-- Verify booking status changed to cancelled
SELECT id, booking_reference, status
FROM bookings
WHERE id = 'YOUR_BOOKING_ID_HERE';

-- Verify seats were released
SELECT * FROM seat_reservations
WHERE booking_id = 'YOUR_BOOKING_ID_HERE';

-- ============================================================================
-- 8. VERIFY INDEXES EXIST
-- ============================================================================

-- List all indexes on bookings table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
ORDER BY indexname;

-- List all indexes on seat_reservations table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'seat_reservations'
ORDER BY indexname;

-- ============================================================================
-- 9. VERIFY CONSTRAINTS
-- ============================================================================

-- List all constraints on bookings table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
ORDER BY conname;

-- Test positive price constraint (should fail)
-- INSERT INTO bookings (booking_reference, schedule_id, booking_date, total_passengers, total_price_zmw, contact_phone)
-- VALUES ('TEST-123', 'VALID_SCHEDULE_ID', '2026-03-15', 1, -100, '+260971234567');

-- Test booking reference format constraint (should fail)
-- INSERT INTO bookings (booking_reference, schedule_id, booking_date, total_passengers, total_price_zmw, contact_phone)
-- VALUES ('invalid', 'VALID_SCHEDULE_ID', '2026-03-15', 1, 100, '+260971234567');

-- ============================================================================
-- 10. PERFORMANCE TESTING
-- ============================================================================

-- Test query performance with EXPLAIN ANALYZE

-- Booking lookup by reference (should use index)
EXPLAIN ANALYZE
SELECT * FROM bookings WHERE booking_reference = 'BK-12345678';

-- Bookings by user (should use index)
EXPLAIN ANALYZE
SELECT * FROM bookings WHERE user_id = 'YOUR_USER_ID_HERE';

-- Bookings by schedule and date (should use indexes)
EXPLAIN ANALYZE
SELECT * FROM bookings 
WHERE schedule_id = 'YOUR_SCHEDULE_ID_HERE'
AND booking_date = '2026-03-15';

-- Seat availability query (should be fast)
EXPLAIN ANALYZE
SELECT * FROM get_available_seats(
  'YOUR_SCHEDULE_ID_HERE'::UUID,
  '2026-03-15'::DATE
);

-- ============================================================================
-- 11. CLEANUP TEST DATA
-- ============================================================================

-- Delete test bookings (be careful!)
-- DELETE FROM bookings WHERE booking_reference LIKE 'BK-%' AND created_at > now() - interval '1 hour';

-- Delete test seat reservations
-- DELETE FROM seat_reservations WHERE session_id LIKE 'test_%';

-- Delete test rate limits
-- DELETE FROM rate_limits WHERE user_id = 'YOUR_USER_ID_HERE';

-- Delete test audit logs
-- DELETE FROM audit_logs WHERE action = 'test_action';

-- ============================================================================
-- 12. MONITORING QUERIES
-- ============================================================================

-- Count active reservations
SELECT 
  status,
  COUNT(*) as count
FROM seat_reservations
GROUP BY status;

-- Count bookings by status (last 7 days)
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(total_price_zmw), 2) as avg_price
FROM bookings
WHERE created_at > now() - interval '7 days'
GROUP BY status;

-- Recent audit activity
SELECT 
  action,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY action
ORDER BY count DESC;

-- Rate limit violations
SELECT 
  user_id,
  action,
  attempt_count,
  blocked_until
FROM rate_limits
WHERE blocked_until > now()
ORDER BY blocked_until DESC;

-- Expired reservations that need cleanup
SELECT COUNT(*)
FROM seat_reservations
WHERE status = 'reserved'
AND expires_at < now();

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Replace placeholders before running:
- YOUR_SCHEDULE_ID_HERE: Get from schedules table
- YOUR_USER_ID_HERE: Get from auth.users or profiles table
- YOUR_BOOKING_ID_HERE: Get from bookings table after creating a test booking

To get valid IDs:
*/

-- Get a schedule ID
SELECT id, departure_time FROM schedules LIMIT 1;

-- Get a user ID
SELECT id FROM auth.users LIMIT 1;

-- Get a booking ID
SELECT id, booking_reference FROM bookings ORDER BY created_at DESC LIMIT 1;
