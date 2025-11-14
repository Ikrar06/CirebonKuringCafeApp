import '../entities/order_entity.dart';
import '../repositories/order_repository.dart';

class WatchOrdersUseCase {
  final OrderRepository repository;

  WatchOrdersUseCase(this.repository);

  Stream<List<OrderEntity>> call() {
    return repository.watchOrders();
  }
}
