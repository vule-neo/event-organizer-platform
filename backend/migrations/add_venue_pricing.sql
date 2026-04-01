-- ============================================================
-- Migration: Add venue_pricing table for flexible slot pricing
-- Run this on Railway PostgreSQL before deploying backend changes
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_pricing (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time  TIME WITHOUT TIME ZONE NOT NULL,
    end_time    TIME WITHOUT TIME ZONE NOT NULL,
    price       DECIMAL(10,2) NOT NULL CHECK (price > 0),
    created_at  TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_venue_pricing_venue_id ON venue_pricing(venue_id);

-- ============================================================
-- Opis tabele:
--   day_of_week: 0=Nedjelja, 1=Ponedeljak, 2=Utorak, 3=Sreda,
--                4=Četvrtak, 5=Petak, 6=Subota
--   start_time / end_time: vremenski opseg (end > start, bez preskoka ponoći)
--   price: cijena u RSD za termine koji padaju unutar ovog opsega
--
-- Ako za dati dan/vrijeme ne postoji pravilo, koristi se
-- venues.price_per_slot kao fallback.
-- ============================================================
