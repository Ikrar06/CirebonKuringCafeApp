import 'package:equatable/equatable.dart';

// Abstract failure class
abstract class Failure extends Equatable {
  final String message;

  const Failure(this.message);

  @override
  List<Object?> get props => [message];
}

// Server failure
class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure(super.message, {this.statusCode});

  @override
  List<Object?> get props => [message, statusCode];
}

// Network failure
class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

// Cache failure
class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

// Authentication failure
class AuthenticationFailure extends Failure {
  const AuthenticationFailure(super.message);
}

// Validation failure
class ValidationFailure extends Failure {
  final Map<String, dynamic>? errors;

  const ValidationFailure(super.message, {this.errors});

  @override
  List<Object?> get props => [message, errors];
}

// Unknown/Generic failure
class UnknownFailure extends Failure {
  const UnknownFailure(super.message);
}
