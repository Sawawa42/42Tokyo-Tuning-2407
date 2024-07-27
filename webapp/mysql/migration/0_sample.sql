-- このファイルに記述されたSQLコマンドが、マイグレーション時に実行されます。
CREATE INDEX idx_tow_truck_id_timestamp ON locations (tow_truck_id, timestamp);

