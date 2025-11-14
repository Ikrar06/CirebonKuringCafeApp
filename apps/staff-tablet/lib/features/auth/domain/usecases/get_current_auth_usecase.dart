import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/auth_entity.dart';
import '../repositories/auth_repository.dart';

class GetCurrentAuthUseCase implements UseCase<AuthEntity?, NoParams> {
  final AuthRepository repository;

  GetCurrentAuthUseCase(this.repository);

  @override
  Future<Either<Failure, AuthEntity?>> call(NoParams params) async {
    return await repository.getCurrentAuth();
  }
}
