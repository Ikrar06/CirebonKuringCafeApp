class ApiEndpoints {
  // Auth endpoints
  static const String deviceLogin = '/auth/device-login';
  static const String employeeLogin = '/auth/employee-login';
  static const String logout = '/auth/logout';

  // Kitchen endpoints
  static const String kitchenOrders = '/kitchen/orders';
  static String bumpOrder(String orderId) => '/kitchen/orders/$orderId/bump';

  // Payment endpoints
  static const String payments = '/payments';
  static String verifyPayment(String paymentId) => '/payments/$paymentId/verify';
  static String paymentProof(String paymentId) => '/payments/$paymentId/proof';

  // Inventory endpoints
  static const String inventory = '/inventory';
  static const String stockIn = '/inventory/stock-in';
  static const String stockOut = '/inventory/stock-out';
  static const String stockOpname = '/inventory/opname';
  static const String lowStock = '/inventory/low-stock';

  // Table endpoints
  static const String tables = '/tables';
  static String tableById(String tableId) => '/tables/$tableId';

  // Order endpoints
  static const String orders = '/orders';
  static String orderById(String orderId) => '/orders/$orderId';
  static String updateOrderStatus(String orderId) => '/orders/$orderId/status';

  // Supplier endpoints
  static const String suppliers = '/suppliers';
  static String supplierById(String supplierId) => '/suppliers/$supplierId';
}
