import { createContext, useContext, useState, useEffect } from 'react';

export type Lang = 'en' | 'ar';

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    orderTracker: 'Order Tracker',
    createOrder: 'Create Order',
    reports: 'Reports',
    users: 'Users',
    auditLog: 'Audit Log',
    signOut: 'Sign Out',
    menu: 'Menu',
    admin: 'Admin',
    settings: 'Settings',
    // Dashboard
    totalOrders: 'Total Orders',
    pendingItems: 'Pending Items',
    overdue: 'Overdue',
    pendingAssetTag: 'Pending Asset Tag',
    pendingITConfig: 'Pending IT Config',
    completed: 'Completed',
    viewInTracker: 'View in tracker',
    ordersByStatus: 'Orders by Status',
    orderTypeSplit: 'Order Type Split',
    overdueDeliveries: 'Overdue Deliveries',
    clickBarToFilter: 'Click a bar to filter tracker by that status',
    clickSliceToFilter: 'Click a slice to filter by type',
    procurementOverview: 'Procurement & delivery overview',
    allOrders: 'All orders',
    // Common
    refresh: 'Refresh',
    newOrder: 'New Order',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search orders…',
    filter: 'Filter',
    export: 'Export',
    loading: 'Loading…',
    noOrdersFound: 'No orders found',
    orders: 'orders',
    // Tracker
    reference: 'Reference',
    type: 'Type',
    vendorEndUser: 'Vendor / End User',
    items: 'Items',
    expectedDelivery: 'Expected',
    status: 'Status',
    // Order statuses
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    PARTIALLY_DELIVERED: 'Partially Delivered',
    FULLY_DELIVERED: 'Fully Delivered',
    COMPLETED: 'Completed',
    DELAYED: 'Delayed',
    // Item statuses
    PENDING_DELIVERY: 'Pending Delivery',
    DELIVERED: 'Delivered',
    STORED: 'Stored',
    PENDING_ASSET_TAGGING: 'Pending Asset Tag',
    ASSET_TAGGED: 'Asset Tagged',
    PENDING_IT_CONFIG: 'Pending IT Config',
    IT_CONFIGURED: 'IT Configured',
    HANDED_OVER: 'Handed Over',
    // Actions
    markReceived: 'Mark Received',
    markAssetTagged: 'Mark Asset Tagged',
    markITConfig: 'Mark IT Config',
    markHandedOver: 'Mark Handed Over',
    // User Management
    userManagement: 'User Management',
    logoSettings: 'Logo & Branding',
    uploadLogo: 'Upload Logo',
    currentLogo: 'Current Logo',
    noLogo: 'No logo uploaded',
    saveLogo: 'Save Logo',
    removeLogo: 'Remove Logo',
    logoHint: 'Upload your organization logo (PNG, JPG, SVG — max 2MB)',
    newUser: 'New User',
    createUser: 'Create User',
    editUser: 'Edit User',
    fullName: 'Full Name',
    email: 'Email',
    role: 'Role',
    department: 'Department',
    initialPassword: 'Initial Password',
    active: 'Active',
    inactive: 'Inactive',
  },
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    orderTracker: 'متتبع الطلبات',
    createOrder: 'إنشاء طلب',
    reports: 'التقارير',
    users: 'المستخدمون',
    auditLog: 'سجل المراجعة',
    signOut: 'تسجيل الخروج',
    menu: 'القائمة',
    admin: 'الإدارة',
    settings: 'الإعدادات',
    // Dashboard
    totalOrders: 'إجمالي الطلبات',
    pendingItems: 'العناصر المعلقة',
    overdue: 'متأخر',
    pendingAssetTag: 'وسم الأصول المعلق',
    pendingITConfig: 'تهيئة تقنية المعلومات',
    completed: 'مكتمل',
    viewInTracker: 'عرض في المتتبع',
    ordersByStatus: 'الطلبات حسب الحالة',
    orderTypeSplit: 'توزيع أنواع الطلبات',
    overdueDeliveries: 'التسليمات المتأخرة',
    clickBarToFilter: 'انقر على الشريط لتصفية المتتبع',
    clickSliceToFilter: 'انقر على القطعة للتصفية حسب النوع',
    procurementOverview: 'نظرة عامة على المشتريات والتسليم',
    allOrders: 'كل الطلبات',
    // Common
    refresh: 'تحديث',
    newOrder: 'طلب جديد',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    search: 'بحث في الطلبات…',
    filter: 'تصفية',
    export: 'تصدير',
    loading: 'جار التحميل…',
    noOrdersFound: 'لا توجد طلبات',
    orders: 'طلبات',
    // Tracker
    reference: 'المرجع',
    type: 'النوع',
    vendorEndUser: 'المورد / المستخدم',
    items: 'العناصر',
    expectedDelivery: 'التسليم المتوقع',
    status: 'الحالة',
    // Order statuses
    PENDING: 'قيد الانتظار',
    IN_PROGRESS: 'جارٍ التنفيذ',
    PARTIALLY_DELIVERED: 'تسليم جزئي',
    FULLY_DELIVERED: 'تسليم كامل',
    COMPLETED: 'مكتمل',
    DELAYED: 'متأخر',
    // Item statuses
    PENDING_DELIVERY: 'في انتظار التسليم',
    DELIVERED: 'تم التسليم',
    STORED: 'مخزَّن',
    PENDING_ASSET_TAGGING: 'في انتظار وسم الأصول',
    ASSET_TAGGED: 'تم وسم الأصول',
    PENDING_IT_CONFIG: 'في انتظار التهيئة',
    IT_CONFIGURED: 'تمت التهيئة',
    HANDED_OVER: 'تم التسليم النهائي',
    // Actions
    markReceived: 'تحديد كمستلَم',
    markAssetTagged: 'تحديد كموسوم',
    markITConfig: 'تحديد كمهيَّأ',
    markHandedOver: 'تحديد كمُسلَّم',
    // User Management
    userManagement: 'إدارة المستخدمين',
    logoSettings: 'الشعار والعلامة التجارية',
    uploadLogo: 'رفع الشعار',
    currentLogo: 'الشعار الحالي',
    noLogo: 'لم يتم رفع شعار',
    saveLogo: 'حفظ الشعار',
    removeLogo: 'إزالة الشعار',
    logoHint: 'ارفع شعار مؤسستك (PNG, JPG, SVG — بحد أقصى 2MB)',
    newUser: 'مستخدم جديد',
    createUser: 'إنشاء مستخدم',
    editUser: 'تعديل مستخدم',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    role: 'الدور',
    department: 'القسم',
    initialPassword: 'كلمة المرور الأولية',
    active: 'نشط',
    inactive: 'غير نشط',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  toggleLang: () => {},
  t: (key) => key as string,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem('mbzuai-lang') as Lang) || 'en'
  );

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('mbzuai-lang', next);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string =>
    (translations[lang] as Record<string, string>)[key as string] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
