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


-- ══════════════════════════════════════════════════════════
--             مغسلة المبحوح - جداول النظام
-- ══════════════════════════════════════════════════════════

-- جدول زبائن المغسلة
CREATE TABLE public.laundry_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    total_debt NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول طلبات المغسلة
CREATE TABLE public.laundry_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.laundry_customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    remaining_debt NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'debt', -- paid | partial | debt
    order_status TEXT DEFAULT 'new',    -- new | washing | ready | delivered
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تفاصيل الطلب (أنواع متعددة في نفس الطلب)
CREATE TABLE public.laundry_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.laundry_orders(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- clothes | carpet | blanket
    weight_kg NUMERIC,       -- للملابس بالكيلو
    with_powder BOOLEAN,     -- مع/بدون مسحوق للملابس
    description TEXT,        -- وصف السجادة أو الحرام
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول دفعات الديون
CREATE TABLE public.laundry_payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.laundry_customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    notes TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول أسعار المغسلة
CREATE TABLE public.laundry_prices (
    key TEXT PRIMARY KEY,
    price NUMERIC DEFAULT 0,
    label TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- الأسعار الافتراضية للمغسلة
INSERT INTO public.laundry_prices (key, price, label) VALUES
('clothes_with_powder', 1.0, 'كيلو الملابس مع مسحوق'),
('clothes_without_powder', 1.5, 'كيلو الملابس بدون مسحوق'),
('carpet_default', 20.0, 'سعر السجادة المقترح'),
('blanket_default', 15.0, 'سعر الحرام المقترح');

-- تفعيل RLS للجداول الجديدة
ALTER TABLE public.laundry_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laundry_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to laundry_customers" ON public.laundry_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to laundry_orders" ON public.laundry_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to laundry_order_items" ON public.laundry_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to laundry_payments" ON public.laundry_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to laundry_prices" ON public.laundry_prices FOR ALL USING (true) WITH CHECK (true);
