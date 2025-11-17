import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/pelayan_repository.dart';

class DeliverOrderUseCase implements UseCase<void, String> {
  final PelayanRepository repository;

  DeliverOrderUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(String params) async {
    return await repository.deliverOrder(params);
  }
}
