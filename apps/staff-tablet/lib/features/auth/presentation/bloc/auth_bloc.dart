import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/usecases/usecase.dart';
import '../../domain/usecases/device_login_usecase.dart';
import '../../domain/usecases/employee_login_usecase.dart';
import '../../domain/usecases/get_current_auth_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final DeviceLoginUseCase deviceLoginUseCase;
  final EmployeeLoginUseCase employeeLoginUseCase;
  final LogoutUseCase logoutUseCase;
  final GetCurrentAuthUseCase getCurrentAuthUseCase;

  AuthBloc({
    required this.deviceLoginUseCase,
    required this.employeeLoginUseCase,
    required this.logoutUseCase,
    required this.getCurrentAuthUseCase,
  }) : super(const AuthInitial()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<DeviceLoginEvent>(_onDeviceLogin);
    on<EmployeeLoginEvent>(_onEmployeeLogin);
    on<LogoutEvent>(_onLogout);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final result = await getCurrentAuthUseCase(const NoParams());

    result.fold(
      (failure) => emit(const Unauthenticated()),
      (auth) {
        if (auth == null) {
          emit(const Unauthenticated());
        } else if (auth.isExpired) {
          emit(const Unauthenticated());
        } else if (auth.isEmployeeLoggedIn) {
          emit(EmployeeAuthenticated(auth));
        } else {
          emit(DeviceAuthenticated(auth));
        }
      },
    );
  }

  Future<void> _onDeviceLogin(
    DeviceLoginEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final params = DeviceLoginParams(
      deviceId: event.deviceId,
      deviceName: event.deviceName,
      deviceType: event.deviceType,
    );

    final result = await deviceLoginUseCase(params);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (auth) => emit(DeviceAuthenticated(auth)),
    );
  }

  Future<void> _onEmployeeLogin(
    EmployeeLoginEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final params = EmployeeLoginParams(pin: event.pin);
    final result = await employeeLoginUseCase(params);

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (auth) => emit(EmployeeAuthenticated(auth)),
    );
  }

  Future<void> _onLogout(
    LogoutEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final result = await logoutUseCase(const NoParams());

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (_) => emit(const Unauthenticated()),
    );
  }
}
