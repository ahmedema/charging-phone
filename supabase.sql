-- إنشاء جدول الزبائن
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول العمليات (الشحن أو الدفع)
CREATE TABLE public.operations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    type TEXT,
    device_type TEXT,
    quantity INTEGER DEFAULT 1,
    amount NUMERIC DEFAULT 0,
    paid NUMERIC DEFAULT 0,
    debt NUMERIC DEFAULT 0,
    from_balance NUMERIC DEFAULT 0,
    payment_mode TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الأسعار لحفظ التسعيرة الحالية
CREATE TABLE public.prices (
    device_type TEXT PRIMARY KEY,
    price NUMERIC DEFAULT 0
);

-- إدخال الأسعار الافتراضية
INSERT INTO public.prices (device_type, price) VALUES 
('phone', 10),
('laptop', 20),
('battery', 5),
('powerbank', 5);

-- Enable RLS (Row Level Security) and create open policies for local/simple use
-- In a real production app you should use authentication, but for now we allow public access
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to operations" ON public.operations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prices" ON public.prices FOR ALL USING (true) WITH CHECK (true);
