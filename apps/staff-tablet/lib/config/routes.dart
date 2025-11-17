import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/bloc/auth_event.dart';
import '../features/auth/presentation/pages/device_login_page.dart';
import '../features/auth/presentation/pages/employee_login_page.dart';
import '../features/kasir/presentation/bloc/kasir_bloc.dart';
import '../features/kasir/presentation/bloc/kasir_event.dart';
import '../features/kasir/presentation/screens/kasir_dashboard.dart';
import '../features/kitchen/presentation/bloc/kitchen_bloc.dart';
import '../features/kitchen/presentation/pages/kitchen_display_page.dart';
import '../features/pelayan/presentation/bloc/pelayan_bloc.dart';
import '../features/pelayan/presentation/bloc/pelayan_event.dart';
import '../features/pelayan/presentation/screens/pelayan_dashboard.dart';
import '../features/stok/presentation/bloc/stock_bloc.dart';
import '../features/stok/presentation/bloc/stock_event.dart';
import '../features/stok/presentation/screens/stok_dashboard.dart';
import 'injection.dart';

class AppRoutes {
  // Route names
  static const String initial = '/';
  static const String deviceSelection = '/device-selection';
  static const String deviceLogin = '/device-login';
  static const String employeeLogin = '/employee-login';

  // Module routes
  static const String dapurDashboard = '/dapur';
  static const String kasirDashboard = '/kasir';
  static const String pelayanDashboard = '/pelayan';
  static const String stokDashboard = '/stok';

  // Route generator
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case initial:
        // Redirect to device login by default
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => sl<AuthBloc>()..add(const CheckAuthStatusEvent()),
            child: const DeviceLoginPage(),
          ),
        );

      case deviceSelection:
        // TODO: Implement device selection screen
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(
              child: Text('Device Selection Screen'),
            ),
          ),
        );

      case deviceLogin:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => sl<AuthBloc>(),
            child: const DeviceLoginPage(),
          ),
        );

      case employeeLogin:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => sl<AuthBloc>(),
            child: const EmployeeLoginPage(),
          ),
        );

      case dapurDashboard:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (_) => sl<KitchenBloc>(),
            child: const KitchenDisplayPage(),
          ),
        );

      case kasirDashboard:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (context) => sl<KasirBloc>()..add(LoadPendingPayments()),
            child: const KasirDashboard(),
          ),
        );

      case pelayanDashboard:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (context) => sl<PelayanBloc>()..add(WatchTables()),
            child: const PelayanDashboard(),
          ),
        );

      case stokDashboard:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (context) => sl<StockBloc>()..add(LoadStockItems()),
            child: const StokDashboard(),
          ),
        );

      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(
              child: Text('Route not found: ${settings.name}'),
            ),
          ),
        );
    }
  }
}
