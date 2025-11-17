import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/table_entity.dart';
import '../repositories/pelayan_repository.dart';

class GetTablesUseCase implements UseCase<List<TableEntity>, NoParams> {
  final PelayanRepository repository;

  GetTablesUseCase(this.repository);

  @override
  Future<Either<Failure, List<TableEntity>>> call(NoParams params) async {
    return await repository.getTables();
  }
}
