import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/network/api_client.dart';
import '../core/network/dio_client.dart';
import '../core/network/network_info.dart';
import '../core/network/supabase_client.dart';
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
import '../features/kitchen/domain/usecases/watch_orders_usecase.dart';
import '../features/kitchen/presentation/bloc/kitchen_bloc.dart';

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
    () => AuthRemoteDataSourceImpl(sl()),
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
  sl.registerLazySingleton(() => WatchOrdersUseCase(sl()));

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

  //! Core
  sl.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(sl()),
  );
  sl.registerLazySingleton(() => ApiClient(sl(), sl()));
  sl.registerLazySingleton(() => DioClient(sl()));
  sl.registerLazySingleton(
    () => SupabaseClientWrapper(Supabase.instance.client, sl()),
  );

  //! External
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);
  sl.registerLazySingleton(() => Connectivity());
}
