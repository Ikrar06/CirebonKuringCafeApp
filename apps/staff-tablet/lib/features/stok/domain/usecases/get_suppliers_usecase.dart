import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/supplier_entity.dart';
import '../repositories/stock_repository.dart';

class GetSuppliersUseCase implements UseCase<List<SupplierEntity>, NoParams> {
  final StockRepository repository;

  GetSuppliersUseCase(this.repository);

  @override
  Future<Either<Failure, List<SupplierEntity>>> call(NoParams params) async {
    return await repository.getSuppliers();
  }
}
