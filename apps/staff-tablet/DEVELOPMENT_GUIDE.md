# Staff Tablet Development Guide

> **Panduan untuk Claude Code** - Baca ini untuk memahami konteks dan implementasi aplikasi staff tablet

---

## 🎯 KONTEKS PENTING (BACA INI DULU!)

### Status Project
- ✅ **Customer Web, Employee Portal, Owner Dashboard**: **SUDAH SELESAI** (Next.js)
- ❌ **Staff Tablet**: **SEMUA FILE MASIH PLACEHOLDER** (110 file, hanya 1 line comment)

### Target
- **Platform**: **Android Tablet Only**
- **Orientation**: **Landscape Only (Lock Portrait)**
- **Screen**: 8-12 inch (1280x800 - 1920x1080)
- **Framework**: Flutter 3.x + BLoC + Clean Architecture

### 4 Role Utama
1. **👨‍🍳 DAPUR** (Kitchen) - Kitchen Display System untuk chef
2. **💰 KASIR** (Cashier) - Payment verification & cash management
3. **🍽️ PELAYAN** (Waiter) - Table & order management
4. **📦 STOK** (Inventory) - Stock tracking & opname

---

## 🎨 Design System (WAJIB IKUTI!)

### Style Reference
**Lihat aplikasi lain** (customer-web, employee-portal) untuk reference style!

### Color Palette
```dart
// Primary colors
const primaryBlue = Color(0xFF2563EB);      // blue-600
const primaryIndigo = Color(0xFF4F46E5);    // indigo-600

// Role colors (untuk header & accent)
const colorDapur = Color(0xFFF97316);       // orange-500
const colorKasir = Color(0xFF10B981);       // green-500
const colorPelayan = Color(0xFF3B82F6);     // blue-500
const colorStok = Color(0xFF8B5CF6);        // purple-500

// Neutral colors
const colorWhite = Color(0xFFFFFFFF);
const colorGray50 = Color(0xFFF9FAFB);
const colorGray100 = Color(0xFFF3F4F6);
const colorGray200 = Color(0xFFE5E7EB);
const colorGray600 = Color(0xFF4B5563);
const colorGray900 = Color(0xFF111827);

// Status colors
const colorSuccess = Color(0xFF10B981);     // green-500
const colorWarning = Color(0xFFF59E0B);     // yellow-500
const colorError = Color(0xFFEF4444);       // red-500
const colorInfo = Color(0xFF3B82F6);        // blue-500
```

### Typography
```dart
// Tablet-optimized text sizes (lebih besar dari mobile)
TextTheme(
  displayLarge: 56.0,   // Hero text
  displayMedium: 45.0,  // Section headers
  displaySmall: 36.0,   // Card headers
  headlineMedium: 28.0, // Subsection
  headlineSmall: 24.0,  // List titles
  titleLarge: 22.0,     // Emphasized
  titleMedium: 18.0,    // Normal text
  bodyLarge: 16.0,      // Body
  bodyMedium: 14.0,     // Secondary
  labelLarge: 16.0,     // Buttons (larger for touch)
)

// Font weight
FontWeight.normal  // 400 - default text
FontWeight.medium  // 500 - emphasis
FontWeight.semibold // 600 - headers
FontWeight.bold    // 700 - important
```

### Component Styles

#### Card Style
```dart
Container(
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12), // rounded-xl
    border: Border.all(color: colorGray200, width: 1),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 10,
        offset: Offset(0, 2),
      ),
    ],
  ),
  padding: EdgeInsets.all(16),
  child: ...
)
```

#### Button Style (Primary)
```dart
ElevatedButton(
  style: ElevatedButton.styleFrom(
    backgroundColor: primaryBlue,
    foregroundColor: Colors.white,
    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
    minimumSize: Size(120, 56), // Large touch target
    elevation: 0,
  ),
  onPressed: () {},
  child: Text('Button'),
)
```

#### Input Field Style
```dart
TextField(
  decoration: InputDecoration(
    filled: true,
    fillColor: colorGray50,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: colorGray200),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: colorGray200),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(color: primaryBlue, width: 2),
    ),
    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  ),
)
```

### Touch Targets
- **Minimum**: 48x48 dp
- **Recommended**: 56-64 dp untuk primary actions
- **Spacing**: Minimum 8dp antar elemen interaktif

---

## 📂 Directory Structure

```
lib/
├── main.dart                   # App entry, DI setup
├── app.dart                    # Root widget
│
├── config/                     # App configuration
│   ├── app_config.dart        # API URLs, constants
│   ├── routes.dart            # Named routes
│   └── theme.dart             # Theme data
│
├── core/                       # Core utilities
│   ├── constants/
│   │   ├── api_endpoints.dart # API URLs
│   │   ├── app_colors.dart    # Color constants
│   │   ├── app_strings.dart   # Text constants
│   │   └── device_types.dart  # Enums
│   ├── errors/
│   │   ├── exceptions.dart    # Custom exceptions
│   │   └── failures.dart      # Failure handling
│   ├── network/
│   │   ├── api_client.dart    # API wrapper
│   │   ├── dio_client.dart    # Dio config
│   │   └── network_info.dart  # Connectivity check
│   ├── usecases/
│   │   └── usecase.dart       # Base UseCase
│   └── utils/
│       ├── extensions.dart    # Dart extensions
│       ├── formatters.dart    # Date, currency
│       └── validators.dart    # Input validation
│
├── domain/                     # Business logic
│   ├── entities/              # Data models (pure Dart)
│   │   ├── order.dart
│   │   ├── payment.dart
│   │   ├── table.dart
│   │   ├── user.dart
│   │   ├── ingredient.dart
│   │   └── menu_item.dart
│   ├── repositories/          # Interfaces
│   │   ├── auth_repository.dart
│   │   ├── order_repository.dart
│   │   └── inventory_repository.dart
│   └── usecases/              # Business operations
│       ├── auth/
│       │   ├── device_login.dart
│       │   ├── employee_login.dart
│       │   └── logout.dart
│       ├── orders/
│       │   ├── get_orders.dart
│       │   ├── update_order_status.dart
│       │   └── verify_payment.dart
│       └── inventory/
│           ├── update_stock.dart
│           └── stock_opname.dart
│
├── presentation/               # UI layer
│   ├── auth/                  # Authentication
│   │   ├── bloc/
│   │   ├── screens/
│   │   └── widgets/
│   ├── dapur/                 # Kitchen module
│   │   ├── bloc/
│   │   ├── screens/
│   │   └── widgets/
│   ├── kasir/                 # Cashier module
│   │   ├── bloc/
│   │   ├── screens/
│   │   └── widgets/
│   ├── pelayan/               # Waiter module
│   │   ├── bloc/
│   │   ├── screens/
│   │   └── widgets/
│   ├── stok/                  # Inventory module
│   │   ├── bloc/
│   │   ├── screens/
│   │   └── widgets/
│   └── shared/                # Shared components
│       ├── theme/
│       └── widgets/
│
└── services/                   # External services
    ├── device_service.dart    # Device info
    ├── realtime_service.dart  # WebSocket/Supabase
    ├── printer_service.dart   # Thermal printer
    ├── camera_service.dart    # Barcode scanner
    └── notification_service.dart
```

---

## 📱 Module Specifications

### 1. 👨‍🍳 DAPUR (Kitchen Module)

**Tujuan**: Kitchen Display System (KDS) untuk tampilkan order real-time

#### Screens

##### `kitchen_display.dart` - Main KDS Screen
**Layout**:
- Header: Filter station, time, order count, alert
- Body: Grid 2-3 kolom, order cards
- Real-time updates via WebSocket

**Features**:
- Order cards dengan timer (elapsed time sejak order masuk)
- Color-coded by urgency: green < 10min, orange < 15min, red > 15min
- "Bump" button besar untuk mark order done
- Audio alert untuk order baru
- Auto-scroll ke oldest order

**Widgets**:
- `order_card.dart` - Display order info + bump button
- `timer_widget.dart` - Live countdown/count-up timer
- `priority_indicator.dart` - Visual urgency indicator

**BLoC Events**:
```dart
LoadKitchenOrders()        // Load all active orders
OrderReceived(Order)       // New order from WebSocket
BumpOrder(String orderId)  // Mark order complete
FilterByStation(String?)   // Filter by prep station
```

**BLoC States**:
```dart
KitchenLoading()
KitchenLoaded(List<Order>, int urgentCount)
KitchenError(String message)
```

---

### 2. 💰 KASIR (Cashier Module)

**Tujuan**: Verifikasi pembayaran, cash reconciliation, transaction management

#### Screens

##### `kasir_dashboard.dart` - Main Dashboard
**Layout**:
- Header: Kasir name, shift time, logout
- Stats cards: Pending payments, today's total
- List: Pending payment verifications
- Actions: Transaction history, daily report, close cash

##### `payment_verification.dart` - Verify Payments
**Layout**:
- Master-detail: List payments (left) + Detail (right)
- Detail shows: Order info, payment method, proof image
- Actions: Approve, Reject, Request resubmit

**Features**:
- View payment proof (zoom, pan)
- Quick approve/reject
- Filter by payment method

##### `cash_reconciliation.dart` - Tutup Kas
**Layout**:
- Expected cash amount
- Physical count by denomination (100k, 50k, 20k, dst)
- Variance calculator
- Notes field

**Widgets**:
- `payment_card.dart` - Compact payment display
- `proof_viewer.dart` - Image viewer with zoom
- `cash_counter.dart` - Denomination input grid
- `variance_calculator.dart` - Show expected vs actual

---

### 3. 🍽️ PELAYAN (Waiter Module)

**Tujuan**: Table management, order delivery tracking

#### Screens

##### `floor_view.dart` - Floor Map
**Layout**:
- Interactive floor map (drag, zoom)
- Tables color-coded by status:
  - Green: available
  - Blue: occupied
  - Orange: food ready
  - Red: needs cleaning
- Sidebar: Ready orders list, filters

**Features**:
- Tap table for quick actions
- Real-time status updates
- Multi-floor support (dropdown)

##### `table_management.dart` - Table Details
- Current order details
- Payment status
- Clear table action
- Merge/split tables

**Widgets**:
- `floor_map.dart` - Custom painter for floor layout
- `table_card.dart` - Table info card
- `ready_orders_list.dart` - Orders ready to serve

---

### 4. 📦 STOK (Inventory Module)

**Tujuan**: Stock management, opname, expiry tracking

#### Screens

##### `inventory_dashboard.dart` - Main Dashboard
**Layout**:
- Stats: Low stock count, expiring items, total items
- Quick actions: Stock in, stock out, opname, suppliers
- Recent activities feed

##### `stock_in.dart` - Barang Masuk
**Form**:
- Ingredient (autocomplete)
- Quantity + unit
- Supplier selector
- Batch number
- Expiry date
- Barcode scanner shortcut

##### `stock_opname.dart` - Physical Count
**Layout**:
- List ingredients with system qty
- Input field untuk physical count
- Auto-calculate variance
- Progress indicator
- Save draft / Complete

**Widgets**:
- `stock_card.dart` - Stock item display
- `stock_form.dart` - Reusable stock form
- `barcode_scanner.dart` - Camera scanner
- `low_stock_alert.dart` - Alert widget

---

## 🔌 API Integration

### Supabase Configuration

```dart
// config/app_config.dart
class AppConfig {
  static const String supabaseUrl =
    String.fromEnvironment('SUPABASE_URL',
      defaultValue: 'https://your-project.supabase.co');

  static const String supabaseAnonKey =
    String.fromEnvironment('SUPABASE_ANON_KEY');

  static String get apiBaseUrl => '$supabaseUrl/functions/v1';
}
```

### API Endpoints

```dart
// core/constants/api_endpoints.dart
class ApiEndpoints {
  // Auth
  static const deviceLogin = '/auth/device-login';
  static const employeeLogin = '/auth/employee-login';

  // Kitchen
  static const kitchenOrders = '/kitchen/orders';
  static const bumpOrder = '/kitchen/orders/{id}/bump';

  // Payments
  static const verifyPayment = '/payments/{id}/verify';
  static const paymentProof = '/payments/{id}/proof';

  // Inventory
  static const inventory = '/inventory';
  static const stockIn = '/inventory/stock-in';
  static const stockOut = '/inventory/stock-out';
  static const stockOpname = '/inventory/opname';

  // Tables
  static const tables = '/tables';
  static const tableById = '/tables/{id}';
}
```

### Real-time Service

```dart
// services/realtime_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class RealtimeService {
  final SupabaseClient _client;

  RealtimeService(this._client);

  // Kitchen orders real-time
  Stream<Order> subscribeKitchenOrders() {
    return _client
        .from('orders')
        .stream(primaryKey: ['id'])
        .eq('status', 'confirmed')
        .map((data) => Order.fromJson(data));
  }

  // Table updates
  Stream<TableEntity> subscribeTableUpdates() {
    return _client
        .from('tables')
        .stream(primaryKey: ['id'])
        .map((data) => TableEntity.fromJson(data));
  }

  // Pending payments
  Stream<Payment> subscribePendingPayments() {
    return _client
        .from('payments')
        .stream(primaryKey: ['id'])
        .eq('status', 'pending')
        .map((data) => Payment.fromJson(data));
  }
}
```

### Dio Client Setup

```dart
// core/network/dio_client.dart
import 'package:dio/dio.dart';

class DioClient {
  late Dio _dio;

  DioClient() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: Duration(seconds: 30),
        receiveTimeout: Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'apikey': AppConfig.supabaseAnonKey,
        },
      ),
    );

    // Add interceptors
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add auth token
        final token = await _getAuthToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Handle unauthorized - logout
        }
        return handler.next(error);
      },
    ));
  }

  Future<String?> _getAuthToken() async {
    // Get token from SharedPreferences
    return null;
  }

  Future<Response> get(String path, {Map<String, dynamic>? params}) {
    return _dio.get(path, queryParameters: params);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) {
    return _dio.patch(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }
}
```

---

## 💻 Code Templates

### 1. Entity Template

```dart
// domain/entities/order.dart
import 'package:equatable/equatable.dart';

class Order extends Equatable {
  final String id;
  final String tableId;
  final String tableName;
  final List<OrderItem> items;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;

  const Order({
    required this.id,
    required this.tableId,
    required this.tableName,
    required this.items,
    required this.status,
    required this.createdAt,
    this.completedAt,
  });

  // Computed property
  Duration get elapsedTime => DateTime.now().difference(createdAt);
  bool get isUrgent => elapsedTime.inMinutes > 15;

  // CopyWith
  Order copyWith({
    String? id,
    String? tableId,
    OrderStatus? status,
    DateTime? completedAt,
  }) {
    return Order(
      id: id ?? this.id,
      tableId: tableId ?? this.tableId,
      tableName: tableName,
      items: items,
      status: status ?? this.status,
      createdAt: createdAt,
      completedAt: completedAt ?? this.completedAt,
    );
  }

  // Equatable
  @override
  List<Object?> get props => [id, tableId, tableName, items, status, createdAt];
}

enum OrderStatus {
  pending,
  confirmed,
  cooking,
  ready,
  served,
  completed,
  cancelled,
}

class OrderItem extends Equatable {
  final String id;
  final String menuItemId;
  final String name;
  final int quantity;
  final double price;

  const OrderItem({
    required this.id,
    required this.menuItemId,
    required this.name,
    required this.quantity,
    required this.price,
  });

  @override
  List<Object?> get props => [id, menuItemId, name, quantity, price];
}
```

### 2. UseCase Template

```dart
// domain/usecases/orders/get_kitchen_orders.dart
import 'package:dartz/dartz.dart';
import '../../entities/order.dart';
import '../../repositories/order_repository.dart';
import '../../../core/errors/failures.dart';
import '../../../core/usecases/usecase.dart';

class GetKitchenOrdersUseCase implements UseCase<List<Order>, NoParams> {
  final OrderRepository repository;

  GetKitchenOrdersUseCase(this.repository);

  @override
  Future<Either<Failure, List<Order>>> call(NoParams params) async {
    return await repository.getKitchenOrders();
  }
}

// core/usecases/usecase.dart
import 'package:dartz/dartz.dart';
import '../errors/failures.dart';

abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

class NoParams extends Equatable {
  @override
  List<Object> get props => [];
}
```

### 3. BLoC Template

```dart
// presentation/dapur/bloc/kitchen_event.dart
abstract class KitchenEvent extends Equatable {
  const KitchenEvent();
  @override
  List<Object?> get props => [];
}

class LoadKitchenOrders extends KitchenEvent {}

class OrderReceived extends KitchenEvent {
  final Order order;
  const OrderReceived(this.order);
  @override
  List<Object?> get props => [order];
}

class BumpOrder extends KitchenEvent {
  final String orderId;
  const BumpOrder(this.orderId);
  @override
  List<Object?> get props => [orderId];
}

// presentation/dapur/bloc/kitchen_state.dart
abstract class KitchenState extends Equatable {
  const KitchenState();
  @override
  List<Object?> get props => [];
}

class KitchenInitial extends KitchenState {}
class KitchenLoading extends KitchenState {}

class KitchenLoaded extends KitchenState {
  final List<Order> orders;
  final int urgentCount;

  const KitchenLoaded(this.orders, this.urgentCount);
  @override
  List<Object?> get props => [orders, urgentCount];
}

class KitchenError extends KitchenState {
  final String message;
  const KitchenError(this.message);
  @override
  List<Object?> get props => [message];
}

// presentation/dapur/bloc/kitchen_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';

class KitchenBloc extends Bloc<KitchenEvent, KitchenState> {
  final GetKitchenOrdersUseCase _getOrders;
  final UpdateOrderStatusUseCase _updateStatus;

  KitchenBloc({
    required GetKitchenOrdersUseCase getOrders,
    required UpdateOrderStatusUseCase updateStatus,
  })  : _getOrders = getOrders,
        _updateStatus = updateStatus,
        super(KitchenInitial()) {
    on<LoadKitchenOrders>(_onLoadOrders);
    on<BumpOrder>(_onBumpOrder);
    on<OrderReceived>(_onOrderReceived);
  }

  Future<void> _onLoadOrders(
    LoadKitchenOrders event,
    Emitter<KitchenState> emit,
  ) async {
    emit(KitchenLoading());

    final result = await _getOrders(NoParams());

    result.fold(
      (failure) => emit(KitchenError(failure.message)),
      (orders) {
        final urgentCount = orders.where((o) => o.isUrgent).length;
        emit(KitchenLoaded(orders, urgentCount));
      },
    );
  }

  Future<void> _onBumpOrder(
    BumpOrder event,
    Emitter<KitchenState> emit,
  ) async {
    if (state is KitchenLoaded) {
      final currentState = state as KitchenLoaded;

      // Optimistic update
      final updatedOrders = currentState.orders
          .where((order) => order.id != event.orderId)
          .toList();

      final urgentCount = updatedOrders.where((o) => o.isUrgent).length;
      emit(KitchenLoaded(updatedOrders, urgentCount));

      // API call
      final result = await _updateStatus(
        UpdateOrderStatusParams(event.orderId, OrderStatus.ready),
      );

      result.fold(
        (failure) {
          // Revert on error
          emit(KitchenLoaded(currentState.orders, currentState.urgentCount));
          emit(KitchenError(failure.message));
        },
        (_) {
          // Success - already updated optimistically
        },
      );
    }
  }

  void _onOrderReceived(
    OrderReceived event,
    Emitter<KitchenState> emit,
  ) {
    if (state is KitchenLoaded) {
      final currentState = state as KitchenLoaded;
      final updatedOrders = [...currentState.orders, event.order];
      final urgentCount = updatedOrders.where((o) => o.isUrgent).length;
      emit(KitchenLoaded(updatedOrders, urgentCount));
    }
  }
}
```

### 4. Screen Template

```dart
// presentation/dapur/screens/kitchen_display.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class KitchenDisplayScreen extends StatefulWidget {
  const KitchenDisplayScreen({Key? key}) : super(key: key);

  @override
  State<KitchenDisplayScreen> createState() => _KitchenDisplayScreenState();
}

class _KitchenDisplayScreenState extends State<KitchenDisplayScreen> {
  @override
  void initState() {
    super.initState();
    // Load orders on init
    context.read<KitchenBloc>().add(LoadKitchenOrders());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: BlocBuilder<KitchenBloc, KitchenState>(
              builder: (context, state) {
                if (state is KitchenLoading) {
                  return Center(child: CircularProgressIndicator());
                }

                if (state is KitchenError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 48, color: Colors.red),
                        SizedBox(height: 16),
                        Text(state.message),
                        SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<KitchenBloc>().add(LoadKitchenOrders());
                          },
                          child: Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state is KitchenLoaded) {
                  if (state.orders.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline,
                               size: 64,
                               color: Colors.green),
                          SizedBox(height: 16),
                          Text('No active orders',
                               style: TextStyle(fontSize: 18)),
                        ],
                      ),
                    );
                  }

                  return GridView.builder(
                    padding: EdgeInsets.all(16),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.75,
                    ),
                    itemCount: state.orders.length,
                    itemBuilder: (context, index) {
                      final order = state.orders[index];
                      return OrderCard(
                        order: order,
                        onBump: () {
                          context.read<KitchenBloc>().add(BumpOrder(order.id));
                        },
                      );
                    },
                  );
                }

                return Container();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFF97316), Color(0xFFEA580C)], // orange gradient
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Icon(Icons.restaurant, color: Colors.white, size: 32),
            SizedBox(width: 12),
            Text(
              'Kitchen Display',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            Spacer(),
            BlocBuilder<KitchenBloc, KitchenState>(
              builder: (context, state) {
                if (state is KitchenLoaded) {
                  return Row(
                    children: [
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${state.orders.length} orders',
                          style: TextStyle(color: Colors.white, fontSize: 16),
                        ),
                      ),
                      if (state.urgentCount > 0) ...[
                        SizedBox(width: 12),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.red,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${state.urgentCount} urgent',
                            style: TextStyle(color: Colors.white, fontSize: 16),
                          ),
                        ),
                      ],
                    ],
                  );
                }
                return Container();
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation (Week 1)

#### Day 1-2: Core Setup
- [ ] `main.dart` - App entry + DI setup (get_it)
- [ ] `app.dart` - Root widget + theme
- [ ] `config/app_config.dart` - Environment config
- [ ] `config/theme.dart` - Theme data (colors, text styles)
- [ ] `core/constants/api_endpoints.dart`
- [ ] `core/constants/app_colors.dart`
- [ ] `core/network/dio_client.dart`
- [ ] `core/errors/exceptions.dart`
- [ ] `core/errors/failures.dart`

#### Day 3-4: Shared Components
- [ ] `presentation/shared/widgets/loading_indicator.dart`
- [ ] `presentation/shared/widgets/error_widget.dart`
- [ ] `presentation/shared/widgets/empty_state.dart`

#### Day 5-7: Authentication
- [ ] `domain/entities/user.dart`
- [ ] `domain/repositories/auth_repository.dart`
- [ ] `domain/usecases/auth/device_login.dart`
- [ ] `domain/usecases/auth/employee_login.dart`
- [ ] `presentation/auth/bloc/` (all files)
- [ ] `presentation/auth/screens/device_login_screen.dart`
- [ ] `presentation/auth/screens/employee_login_screen.dart`
- [ ] `services/device_service.dart`

### Phase 2: Kitchen Module (Week 2-3) - PRIORITAS TERTINGGI

#### Day 1-3: Domain + BLoC
- [ ] `domain/entities/order.dart`
- [ ] `domain/entities/menu_item.dart`
- [ ] `domain/repositories/order_repository.dart`
- [ ] `domain/usecases/orders/get_orders.dart`
- [ ] `domain/usecases/orders/update_order_status.dart`
- [ ] `presentation/dapur/bloc/` (all files)

#### Day 4-7: UI
- [ ] `presentation/dapur/screens/kitchen_display.dart` - **MAIN SCREEN**
- [ ] `presentation/dapur/widgets/order_card.dart`   
- [ ] `presentation/dapur/widgets/timer_widget.dart`
- [ ] `presentation/dapur/widgets/bump_button.dart`
- [ ] `services/realtime_service.dart` - WebSocket orders

### Phase 3: Kasir Module (Week 3-4)

- [ ] `domain/entities/payment.dart`
- [ ] `domain/usecases/orders/verify_payment.dart`
- [ ] `presentation/kasir/bloc/` (all files)
- [ ] `presentation/kasir/screens/kasir_dashboard.dart`
- [ ] `presentation/kasir/screens/payment_verification.dart`
- [ ] `presentation/kasir/screens/cash_reconciliation.dart`
- [ ] `presentation/kasir/widgets/payment_card.dart`
- [ ] `presentation/kasir/widgets/proof_viewer.dart`
- [ ] `presentation/kasir/widgets/cash_counter.dart`

### Phase 4: Pelayan Module (Week 4-5)

- [ ] `domain/entities/table.dart`
- [ ] `presentation/pelayan/bloc/` (all files)
- [ ] `presentation/pelayan/screens/floor_view.dart`
- [ ] `presentation/pelayan/screens/table_management.dart`
- [ ] `presentation/pelayan/widgets/floor_map.dart`
- [ ] `presentation/pelayan/widgets/table_card.dart`

### Phase 5: Stok Module (Week 5-6)

- [ ] `domain/entities/ingredient.dart`
- [ ] `domain/repositories/inventory_repository.dart`
- [ ] `domain/usecases/inventory/` (all files)
- [ ] `presentation/stok/bloc/` (all files)
- [ ] `presentation/stok/screens/inventory_dashboard.dart`
- [ ] `presentation/stok/screens/stock_in.dart`
- [ ] `presentation/stok/screens/stock_out.dart`
- [ ] `presentation/stok/screens/stock_opname.dart`
- [ ] `presentation/stok/widgets/stock_card.dart`
- [ ] `services/camera_service.dart` - Barcode scanner

### Phase 6: Hardware Services (Week 6)

- [ ] `services/printer_service.dart` - Thermal printer
- [ ] `services/notification_service.dart` - Local notifications
- [ ] `services/bluetooth_service.dart` - Bluetooth connectivity

---

## 🚀 Quick Start Guide

### Setup Project

```bash
# Navigate to project
cd apps/staff-tablet

# Install dependencies
flutter pub get

# Generate code (for injectable DI)
flutter pub run build_runner build --delete-conflicting-outputs

# Run on device
flutter run
```

### Landscape Configuration (WAJIB!)

**IMPORTANT**: Aplikasi ini harus LOCKED ke landscape mode.

#### 1. Update `android/app/src/main/AndroidManifest.xml`:
```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="landscape"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
    ...>
```

#### 2. Set di `main.dart` saat app start:
```dart
import 'package:flutter/services.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to landscape
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  runApp(MyApp());
}
```

#### 3. Hide system UI (optional, untuk fullscreen):
```dart
SystemChrome.setEnabledSystemUIMode(
  SystemUiMode.immersiveSticky,
  overlays: [],
);
```

### Environment Setup

Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Development Flow

1. **Start with Auth Module** - Foundation untuk semua module
2. **Then Kitchen Module** - Paling critical untuk operations
3. **Then Kasir** - Payment verification important
4. **Then Pelayan & Stok** - Supporting modules

### Testing

```bash
# Run tests
flutter test

# Run with coverage
flutter test --coverage
```

---

## 📚 Important Notes for Claude Code

### Saat Implement Screen Baru:

1. **Selalu buat BLoC dulu** sebelum UI
2. **Gunakan BlocBuilder** untuk reactive UI
3. **Handle semua states**: Loading, Loaded, Error, Empty
4. **Optimistic updates** untuk better UX
5. **Large touch targets** (min 48dp, recommended 56-64dp)
6. **Design untuk landscape** - Layout horizontal (gunakan Row, tidak Column sebagai primary)

### Layout Guidelines (Landscape):

```dart
// GOOD: Horizontal layout untuk landscape
Row(
  children: [
    Expanded(
      flex: 2,
      child: MainContent(), // 60-70% width
    ),
    Expanded(
      flex: 1,
      child: Sidebar(),     // 30-40% width
    ),
  ],
)

// BAD: Vertical layout (untuk portrait)
Column(
  children: [
    MainContent(),
    Sidebar(),
  ],
)
```

### Style Konsistency:

- White background untuk cards
- Gray-50 untuk page background
- Border gray-200 untuk outlines
- Shadow subtle (0.05-0.1 opacity)
- Rounded corners 8-12dp
- Gradient hanya untuk headers

### Real-time Updates:

- Use Supabase Realtime untuk:
  - Kitchen orders
  - Table status
  - Pending payments
- Subscribe on screen init
- Unsubscribe on dispose
- Handle connection errors gracefully

### Error Handling:

```dart
// Always wrap API calls in try-catch
try {
  final result = await apiCall();
  // Handle success
} catch (e) {
  // Handle error
  emit(ErrorState(e.toString()));
}
```

---

## 🎯 Priority Focus

**MULAI DARI SINI** (berurutan):

1. ✅ Core setup (config, network, errors)
2. ✅ Shared widgets (loading, error, empty)
3. ✅ Auth module (device + employee login)
4. 🔥 **Kitchen Display** (PALING PENTING!)
5. Kasir module
6. Pelayan module
7. Stok module
8. Hardware services

### ⚠️ Critical Reminders:

1. **🔒 LANDSCAPE ONLY** - Lock orientation di AndroidManifest.xml dan main.dart
2. **🎨 Minimalist Style** - Follow customer-web/employee-portal design
3. **📱 Large Touch Targets** - Minimum 56dp untuk buttons
4. **🔄 Real-time** - Use Supabase Realtime untuk Kitchen & Tables
5. **📦 Clean Architecture** - Domain → Presentation → Core

---

**Last Updated**: November 13, 2025
**Version**: 2.0.0 - Revised for Claude Code (Landscape Mode)
**Status**: All 110 files are placeholders - Ready for implementation

