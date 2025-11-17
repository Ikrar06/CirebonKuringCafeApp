import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/supplier_entity.dart';
import '../repositories/stock_repository.dart';

class CreateSupplierUseCase implements UseCase<SupplierEntity, SupplierEntity> {
  final StockRepository repository;

  CreateSupplierUseCase(this.repository);

  @override
  Future<Either<Failure, SupplierEntity>> call(SupplierEntity params) async {
    return await repository.createSupplier(params);
  }
}
