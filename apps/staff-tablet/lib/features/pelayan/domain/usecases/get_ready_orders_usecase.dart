import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/order_with_table_entity.dart';
import '../repositories/pelayan_repository.dart';

class GetReadyOrdersUseCase implements UseCase<List<OrderWithTableEntity>, NoParams> {
  final PelayanRepository repository;

  GetReadyOrdersUseCase(this.repository);

  @override
  Future<Either<Failure, List<OrderWithTableEntity>>> call(NoParams params) async {
    return await repository.getReadyOrders();
  }
}
