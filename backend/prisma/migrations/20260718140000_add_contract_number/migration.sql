-- Add contract identification to monitored equipments
ALTER TABLE "equipments" ADD COLUMN "contractNumber" TEXT;

CREATE INDEX "equipments_contractNumber_idx" ON "equipments"("contractNumber");
