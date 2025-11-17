import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/order_with_table_entity.dart';
import '../repositories/pelayan_repository.dart';

class WatchReadyOrdersUseCase {
  final PelayanRepository repository;

  WatchReadyOrdersUseCase(this.repository);

  Stream<Either<Failure, List<OrderWithTableEntity>>> call() {
    return repository.watchReadyOrders();
  }
}
