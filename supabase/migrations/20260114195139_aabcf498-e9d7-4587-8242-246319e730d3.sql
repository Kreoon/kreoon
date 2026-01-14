
-- Create triggers to automatically update totals when new UP records are inserted

-- Trigger for up_creadores
CREATE OR REPLACE FUNCTION trigger_update_up_creadores_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the existing update function
  PERFORM update_up_creadores_totals(NEW.user_id, NEW.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_up_creadores_insert
AFTER INSERT ON up_creadores
FOR EACH ROW
EXECUTE FUNCTION trigger_update_up_creadores_totals();

-- Trigger for up_editores
CREATE OR REPLACE FUNCTION trigger_update_up_editores_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the existing update function
  PERFORM update_up_editores_totals(NEW.user_id, NEW.organization_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_up_editores_insert
AFTER INSERT ON up_editores
FOR EACH ROW
EXECUTE FUNCTION trigger_update_up_editores_totals();
