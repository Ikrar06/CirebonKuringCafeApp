import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/order_with_payment_entity.dart';
import '../repositories/kasir_repository.dart';

class WatchOrdersUseCase {
  final KasirRepository repository;

  WatchOrdersUseCase(this.repository);

  Stream<Either<Failure, List<OrderWithPaymentEntity>>> call() {
    return repository.watchOrders();
  }
}
