// Supabase 資料庫型別定義

export type Database = {
    public: {
        Tables: {
            receipts: {
                Row: Receipt
                Insert: Omit<Receipt, 'id' | 'created_at'>
                Update: Partial<Omit<Receipt, 'id' | 'created_at'>>
            }
            transactions: {
                Row: Transaction
                Insert: Omit<Transaction, 'id' | 'created_at'>
                Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
            }
            budget_accounts: {
                Row: BudgetAccount
                Insert: Omit<BudgetAccount, 'id' | 'created_at'>
                Update: Partial<Omit<BudgetAccount, 'id' | 'created_at'>>
            }
        }
    }
}

export type Receipt = {
    id: number
    receipt_no: string
    date: string               // ISO date string
    donor_name: string
    phone: string | null
    address: string | null
    category: string           // 光明燈 | 平安燈 | 一般捐款 | ...
    amount: number
    handler: string | null     // 經手人
    payment_method: string | null
    status: 'normal' | 'voided'
    void_reason: string | null
    created_at: string
}

export type Transaction = {
    id: number
    txn_no: string
    date: string
    description: string
    category: string
    amount: number             // 正數=收入, 負數=支出
    status: 'completed' | 'pending'
    created_at: string
}

export type BudgetAccount = {
    id: number
    year: number
    month: number | null       // null 表示年度科目
    account_type: 'income' | 'expense'
    account_name: string
    budget_amount: number
    actual_amount: number
    created_at: string
}
