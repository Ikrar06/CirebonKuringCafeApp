import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/network/api_client.dart';
import '../core/network/dio_client.dart';
import '../core/network/network_info.dart';
import '../core/network/supabase_client.dart';
import '../services/notification_service.dart';
import '../features/auth/data/datasources/auth_local_datasource.dart';
import '../features/auth/data/datasources/auth_remote_datasource.dart';
import '../features/auth/data/repositories/auth_repository_impl.dart';
import '../features/auth/domain/repositories/auth_repository.dart';
import '../features/auth/domain/usecases/device_login_usecase.dart';
import '../features/auth/domain/usecases/employee_login_usecase.dart';
import '../features/auth/domain/usecases/get_current_auth_usecase.dart';
import '../features/auth/domain/usecases/logout_usecase.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/kitchen/data/datasources/order_local_datasource.dart';
import '../features/kitchen/data/datasources/order_remote_datasource.dart';
import '../features/kitchen/data/repositories/order_repository_impl.dart';
import '../features/kitchen/domain/repositories/order_repository.dart';
import '../features/kitchen/domain/usecases/bump_order_usecase.dart';
import '../features/kitchen/domain/usecases/get_active_orders_usecase.dart';
import '../features/kitchen/domain/usecases/update_order_status_usecase.dart';
import '../features/kitchen/domain/usecases/watch_orders_usecase.dart' as kitchen_watch;
import '../features/kitchen/presentation/bloc/kitchen_bloc.dart';
import '../features/stok/data/datasources/stock_local_datasource.dart';
import '../features/stok/data/datasources/stock_remote_datasource.dart';
import '../features/stok/data/repositories/stock_repository_impl.dart';
import '../features/stok/domain/repositories/stock_repository.dart';
import '../features/stok/domain/usecases/create_stock_item_usecase.dart';
import '../features/stok/domain/usecases/create_stock_movement_usecase.dart';
import '../features/stok/domain/usecases/create_supplier_usecase.dart';
import '../features/stok/domain/usecases/delete_stock_item_usecase.dart';
import '../features/stok/domain/usecases/get_low_stock_items_usecase.dart';
import '../features/stok/domain/usecases/get_stock_items_usecase.dart';
import '../features/stok/domain/usecases/get_stock_movements_usecase.dart';
import '../features/stok/domain/usecases/get_suppliers_usecase.dart';
import '../features/stok/domain/usecases/update_stock_item_usecase.dart';
import '../features/stok/domain/usecases/watch_stock_items_usecase.dart';
import '../features/stok/presentation/bloc/stock_bloc.dart';
import '../features/kasir/data/datasources/kasir_local_datasource.dart';
import '../features/kasir/data/datasources/kasir_remote_datasource.dart';
import '../features/kasir/data/repositories/kasir_repository_impl.dart';
import '../features/kasir/domain/repositories/kasir_repository.dart';
import '../features/kasir/domain/usecases/create_cash_summary_usecase.dart';
import '../features/kasir/domain/usecases/get_pending_payments_usecase.dart';
import '../features/kasir/domain/usecases/verify_payment_usecase.dart';
import '../features/kasir/domain/usecases/watch_orders_usecase.dart' as kasir_watch;
import '../features/kasir/presentation/bloc/kasir_bloc.dart';
import '../features/pelayan/data/datasources/pelayan_local_datasource.dart';
import '../features/pelayan/data/datasources/pelayan_remote_datasource.dart';
import '../features/pelayan/data/repositories/pelayan_repository_impl.dart';
import '../features/pelayan/domain/repositories/pelayan_repository.dart';
import '../features/pelayan/domain/usecases/deliver_order_usecase.dart';
import '../features/pelayan/domain/usecases/watch_ready_orders_usecase.dart';
import '../features/pelayan/domain/usecases/watch_tables_usecase.dart';
import '../features/pelayan/presentation/bloc/pelayan_bloc.dart';

final sl = GetIt.instance;

Future<void> setupDependencyInjection() async {
  //! Features - Auth
  // Bloc
  sl.registerFactory(
    () => AuthBloc(
      deviceLoginUseCase: sl(),
      employeeLoginUseCase: sl(),
      logoutUseCase: sl(),
      getCurrentAuthUseCase: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => DeviceLoginUseCase(sl()));
  sl.registerLazySingleton(() => EmployeeLoginUseCase(sl()));
  sl.registerLazySingleton(() => LogoutUseCase(sl()));
  sl.registerLazySingleton(() => GetCurrentAuthUseCase(sl()));

  // Repository
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(Supabase.instance.client),
  );
  sl.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(sl()),
  );

  //! Features - Kitchen
  // Bloc
  sl.registerFactory(
    () => KitchenBloc(
      getActiveOrdersUseCase: sl(),
      updateOrderStatusUseCase: sl(),
      bumpOrderUseCase: sl(),
      watchOrdersUseCase: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => GetActiveOrdersUseCase(sl()));
  sl.registerLazySingleton(() => UpdateOrderStatusUseCase(sl()));
  sl.registerLazySingleton(() => BumpOrderUseCase(sl()));
  sl.registerLazySingleton(() => kitchen_watch.WatchOrdersUseCase(sl()));

  // Repository
  sl.registerLazySingleton<OrderRepository>(
    () => OrderRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<OrderRemoteDataSource>(
    () => OrderRemoteDataSourceImpl(sl(), sl()),
  );
  sl.registerLazySingleton<OrderLocalDataSource>(
    () => OrderLocalDataSourceImpl(sl()),
  );

  //! Features - Stock
  // Bloc
  sl.registerFactory(
    () => StockBloc(
      getStockItemsUseCase: sl(),
      watchStockItemsUseCase: sl(),
      createStockItemUseCase: sl(),
      updateStockItemUseCase: sl(),
      deleteStockItemUseCase: sl(),
      getLowStockItemsUseCase: sl(),
      createStockMovementUseCase: sl(),
      getStockMovementsUseCase: sl(),
      getSuppliersUseCase: sl(),
      createSupplierUseCase: sl(),
      notificationService: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => GetStockItemsUseCase(sl()));
  sl.registerLazySingleton(() => WatchStockItemsUseCase(sl()));
  sl.registerLazySingleton(() => CreateStockItemUseCase(sl()));
  sl.registerLazySingleton(() => UpdateStockItemUseCase(sl()));
  sl.registerLazySingleton(() => DeleteStockItemUseCase(sl()));
  sl.registerLazySingleton(() => GetLowStockItemsUseCase(sl()));
  sl.registerLazySingleton(() => CreateStockMovementUseCase(sl()));
  sl.registerLazySingleton(() => GetStockMovementsUseCase(sl()));
  sl.registerLazySingleton(() => GetSuppliersUseCase(sl()));
  sl.registerLazySingleton(() => CreateSupplierUseCase(sl()));

  // Repository
  sl.registerLazySingleton<StockRepository>(
    () => StockRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<StockRemoteDataSource>(
    () => StockRemoteDataSourceImpl(sl(), sl()),
  );
  sl.registerLazySingleton<StockLocalDataSource>(
    () => StockLocalDataSourceImpl(sl()),
  );

  //! Features - Kasir
  // Bloc
  sl.registerFactory(
    () => KasirBloc(
      getPendingPaymentsUseCase: sl(),
      verifyPaymentUseCase: sl(),
      watchOrdersUseCase: sl(),
      createCashSummaryUseCase: sl(),
      notificationService: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => GetPendingPaymentsUseCase(sl()));
  sl.registerLazySingleton(() => VerifyPaymentUseCase(sl()));
  sl.registerLazySingleton(() => kasir_watch.WatchOrdersUseCase(sl()));
  sl.registerLazySingleton(() => CreateCashSummaryUseCase(sl()));

  // Repository
  sl.registerLazySingleton<KasirRepository>(
    () => KasirRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<KasirRemoteDataSource>(
    () => KasirRemoteDataSourceImpl(sl(), sl()),
  );
  sl.registerLazySingleton<KasirLocalDataSource>(
    () => KasirLocalDataSourceImpl(sl()),
  );

  //! Features - Pelayan
  // Bloc
  sl.registerFactory(
    () => PelayanBloc(
      watchTablesUseCase: sl(),
      watchReadyOrdersUseCase: sl(),
      deliverOrderUseCase: sl(),
      notificationService: sl(),
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => WatchTablesUseCase(sl()));
  sl.registerLazySingleton(() => WatchReadyOrdersUseCase(sl()));
  sl.registerLazySingleton(() => DeliverOrderUseCase(sl()));

  // Repository
  sl.registerLazySingleton<PelayanRepository>(
    () => PelayanRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<PelayanRemoteDataSource>(
    () => PelayanRemoteDataSourceImpl(sl(), sl()),
  );
  sl.registerLazySingleton<PelayanLocalDataSource>(
    () => PelayanLocalDataSourceImpl(sl()),
  );

  //! Core
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(sl()),
  );
  sl.registerLazySingleton(() => ApiClient(sl(), sl()));
  sl.registerLazySingleton(() => DioClient(sl()));
  sl.registerLazySingleton(
    () => SupabaseClientWrapper(Supabase.instance.client, sl()),
  );

  // Services
  sl.registerLazySingleton(() => NotificationService());

  //! External
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => Connectivity());
}
