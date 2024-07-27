-- このファイルに記述されたSQLコマンドが、マイグレーション時に実行されます。
set global slow_query_log=1;
set global long_query_time=0.1;
CREATE INDEX idx_tow_truck_id_timestamp ON locations (tow_truck_id, timestamp);
-- CREATE INDEX idx_username ON users (username);
