import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/table_entity.dart';
import '../repositories/pelayan_repository.dart';

class WatchTablesUseCase {
  final PelayanRepository repository;

  WatchTablesUseCase(this.repository);

  Stream<Either<Failure, List<TableEntity>>> call() {
    return repository.watchTables();
  }
}
