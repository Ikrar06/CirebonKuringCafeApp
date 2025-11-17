import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/stock_item_entity.dart';
import '../repositories/stock_repository.dart';

class WatchStockItemsUseCase {
  final StockRepository repository;

  WatchStockItemsUseCase(this.repository);

  Stream<Either<Failure, List<StockItemEntity>>> call() {
    return repository.watchStockItems();
  }
}
