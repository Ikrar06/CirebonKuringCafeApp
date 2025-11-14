import 'package:dartz/dartz.dart';

import '../errors/failures.dart';

/// Base class for all use cases in the app.
/// Takes a [Params] type and returns Either<Failure, Type>
///
/// Example:
/// ```dart
/// class LoginUseCase implements UseCase<AuthEntity, LoginParams> {
///   final AuthRepository repository;
///
///   LoginUseCase(this.repository);
///
///   @override
///   Future<Either<Failure, Type>> call(LoginParams params) async {
///     return await repository.login(params.email, params.password);
///   }
/// }
/// ```
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

/// For use cases that don't need parameters
class NoParams {
  const NoParams();
}
