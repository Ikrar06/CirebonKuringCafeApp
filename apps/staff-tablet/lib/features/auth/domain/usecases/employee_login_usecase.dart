import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/auth_entity.dart';
import '../repositories/auth_repository.dart';

class EmployeeLoginUseCase implements UseCase<AuthEntity, EmployeeLoginParams> {
  final AuthRepository repository;

  EmployeeLoginUseCase(this.repository);

  @override
  Future<Either<Failure, AuthEntity>> call(EmployeeLoginParams params) async {
    return await repository.employeeLogin(pin: params.pin);
  }
}

class EmployeeLoginParams extends Equatable {
  final String pin;

  const EmployeeLoginParams({required this.pin});

  @override
  List<Object> get props => [pin];
}
