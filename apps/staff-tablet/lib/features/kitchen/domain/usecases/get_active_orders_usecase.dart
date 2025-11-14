import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/order_entity.dart';
import '../repositories/order_repository.dart';

class GetActiveOrdersUseCase implements UseCase<List<OrderEntity>, NoParams> {
  final OrderRepository repository;

  GetActiveOrdersUseCase(this.repository);

  @override
  Future<Either<Failure, List<OrderEntity>>> call(NoParams params) async {
    return await repository.getActiveOrders();
  }
}
