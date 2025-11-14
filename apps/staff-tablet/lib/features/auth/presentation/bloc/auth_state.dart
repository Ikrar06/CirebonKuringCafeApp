import 'package:equatable/equatable.dart';

import '../../domain/entities/auth_entity.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class AuthInitial extends AuthState {
  const AuthInitial();
}

/// Loading state
class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Device is logged in (no employee yet)
class DeviceAuthenticated extends AuthState {
  final AuthEntity auth;

  const DeviceAuthenticated(this.auth);

  @override
  List<Object> get props => [auth];
}

/// Employee is logged in
class EmployeeAuthenticated extends AuthState {
  final AuthEntity auth;

  const EmployeeAuthenticated(this.auth);

  @override
  List<Object> get props => [auth];
}

/// Not authenticated (need device login)
class Unauthenticated extends AuthState {
  const Unauthenticated();
}

/// Authentication error
class AuthError extends AuthState {
  final String message;

  const AuthError(this.message);

  @override
  List<Object> get props => [message];
}
