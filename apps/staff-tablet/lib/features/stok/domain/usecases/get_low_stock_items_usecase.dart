import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/stock_item_entity.dart';
import '../repositories/stock_repository.dart';

class GetLowStockItemsUseCase implements UseCase<List<StockItemEntity>, NoParams> {
  final StockRepository repository;

  GetLowStockItemsUseCase(this.repository);

  @override
  Future<Either<Failure, List<StockItemEntity>>> call(NoParams params) async {
    return await repository.getLowStockItems();
  }
}
