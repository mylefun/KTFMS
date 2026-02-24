-- ============================================================
-- 開山廟財務系統 - Supabase 資料庫 Schema
-- 請在 Supabase 控制台的 SQL Editor 執行此檔案
-- ============================================================

-- 1. 收據表（收入明細）
CREATE TABLE IF NOT EXISTS receipts (
  id             BIGSERIAL PRIMARY KEY,
  receipt_no     TEXT NOT NULL UNIQUE,       -- 收據序號，例：REC-2024-001
  date           DATE NOT NULL,              -- 收款日期
  donor_name     TEXT NOT NULL,              -- 捐款人姓名
  phone          TEXT,                       -- 聯絡電話
  address        TEXT,                       -- 地址
  category       TEXT NOT NULL,              -- 科目種類：光明燈 / 平安燈 / 一般捐款 etc.
  amount         NUMERIC(12,2) NOT NULL,     -- 金額
  handler        TEXT,                       -- 經手人 / 收款人
  payment_method TEXT,                       -- 付款方式：現金 / 轉帳 etc.
  status         TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'voided')),
  void_reason    TEXT,                       -- 作廢理由（status='voided' 時填寫）
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. 流水帳（Dashboard 近期活動用）
CREATE TABLE IF NOT EXISTS transactions (
  id            BIGSERIAL PRIMARY KEY,
  txn_no        TEXT NOT NULL UNIQUE,         -- 交易編號，例：TRX-2024-001
  date          DATE NOT NULL,
  description   TEXT NOT NULL,               -- 交易描述
  category      TEXT NOT NULL,               -- 類別：光明燈 / 平安燈 / 水電費 / 活動支出 etc.
  amount        NUMERIC(12,2) NOT NULL,      -- 正數=收入, 負數=支出
  status        TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. 預算科目（Budget 預算報表用）
CREATE TABLE IF NOT EXISTS budget_accounts (
  id             BIGSERIAL PRIMARY KEY,
  year           INT NOT NULL,               -- 年度，例：2024
  month          INT CHECK (month BETWEEN 1 AND 12),  -- 月份（NULL 表示年度科目）
  account_type   TEXT NOT NULL CHECK (account_type IN ('income', 'expense')),
  account_name   TEXT NOT NULL,              -- 科目名稱：一般捐款 / 法會收入 / 寺廟修繕 etc.
  budget_amount  NUMERIC(12,2) NOT NULL,     -- 預算金額
  actual_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,    -- 實際金額
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 範例測試資料（可選擇執行）
-- ============================================================

-- 收據測試資料
INSERT INTO receipts (receipt_no, date, donor_name, phone, address, category, amount, handler, payment_method, status) VALUES
  ('REC-2024-001', '2024-10-24', '王小明', '0912-345-678', '台北市中山路123號', '光明燈', 1200.00, '蔡先生', '現金', 'normal'),
  ('REC-2024-002', '2024-10-24', '陳美玲', '0922-111-222', '台北市信義路456號', '平安燈', 600.00,  '阿明',  '現金', 'normal'),
  ('REC-2024-003', '2024-10-23', '林大衛', '0933-333-444', '新北市板橋區中正路1號', '一般捐款', 2000.00, '蔡先生', '轉帳', 'voided'),
  ('REC-2024-004', '2024-10-23', '黃怡伶', NULL, NULL, '平安燈', 600.00, '阿明', '現金', 'normal'),
  ('REC-2024-005', '2024-10-22', '吳建豪', '0955-666-777', '桃園市中壢區中山路88號', '光明燈', 1200.00, '蔡先生', '現金', 'normal');

-- 流水帳測試資料
INSERT INTO transactions (txn_no, date, description, category, amount, status) VALUES
  ('TRX-2024-001', '2024-10-24', '捐款 - 王先生', '光明燈',   1200.00, 'completed'),
  ('TRX-2024-002', '2024-10-23', '公用事業費用 - 電費', '水電費', -450.25, 'completed'),
  ('TRX-2024-003', '2024-10-22', '法會用品', '活動支出', -1800.00, 'pending'),
  ('TRX-2024-004', '2024-10-22', '捐款 - 匿名', '平安燈', 200.00, 'completed');

-- 預算科目測試資料（2024年）
INSERT INTO budget_accounts (year, month, account_type, account_name, budget_amount, actual_amount) VALUES
  (2024, 10, 'income',  '一般捐款', 500000, 485000),
  (2024, 10, 'income',  '法會收入', 200000, 150000),
  (2024, 10, 'income',  '線上捐款', 100000,  85000),
  (2024, 10, 'expense', '寺廟修繕', 150000,  45000),
  (2024, 10, 'expense', '法會供品',  50000,  62000),
  (2024, 10, 'expense', '人事薪資', 200000, 123000);
