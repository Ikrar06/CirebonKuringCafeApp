import 'package:equatable/equatable.dart';

abstract class PelayanEvent extends Equatable {
  const PelayanEvent();

  @override
  List<Object?> get props => [];
}

class WatchTables extends PelayanEvent {}

class WatchReadyOrders extends PelayanEvent {}

class DeliverOrder extends PelayanEvent {
  final String orderId;

  const DeliverOrder(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

class UpdateTableStatus extends PelayanEvent {
  final String tableId;
  final String status;

  const UpdateTableStatus(this.tableId, this.status);

  @override
  List<Object?> get props => [tableId, status];
}
