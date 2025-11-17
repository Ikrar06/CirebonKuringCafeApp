import 'package:equatable/equatable.dart';

import '../../domain/entities/order_with_table_entity.dart';
import '../../domain/entities/table_entity.dart';

abstract class PelayanState extends Equatable {
  const PelayanState();

  @override
  List<Object?> get props => [];
}

class PelayanInitial extends PelayanState {}

class PelayanLoading extends PelayanState {}

class PelayanLoaded extends PelayanState {
  final List<TableEntity> tables;
  final List<OrderWithTableEntity> readyOrders;

  const PelayanLoaded({
    this.tables = const [],
    this.readyOrders = const [],
  });

  PelayanLoaded copyWith({
    List<TableEntity>? tables,
    List<OrderWithTableEntity>? readyOrders,
  }) {
    return PelayanLoaded(
      tables: tables ?? this.tables,
      readyOrders: readyOrders ?? this.readyOrders,
    );
  }

  @override
  List<Object?> get props => [tables, readyOrders];
}

class PelayanOperationSuccess extends PelayanState {
  final String message;

  const PelayanOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class PelayanError extends PelayanState {
  final String message;

  const PelayanError(this.message);

  @override
  List<Object?> get props => [message];
}
