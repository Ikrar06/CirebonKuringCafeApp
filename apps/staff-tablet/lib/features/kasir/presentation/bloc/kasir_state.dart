import 'package:equatable/equatable.dart';

import '../../domain/entities/order_with_payment_entity.dart';

abstract class KasirState extends Equatable {
  const KasirState();

  @override
  List<Object?> get props => [];
}

class KasirInitial extends KasirState {}

class KasirLoading extends KasirState {}

class KasirLoaded extends KasirState {
  final List<OrderWithPaymentEntity> orders;
  final List<OrderWithPaymentEntity> pendingPayments;

  const KasirLoaded({
    this.orders = const [],
    this.pendingPayments = const [],
  });

  KasirLoaded copyWith({
    List<OrderWithPaymentEntity>? orders,
    List<OrderWithPaymentEntity>? pendingPayments,
  }) {
    return KasirLoaded(
      orders: orders ?? this.orders,
      pendingPayments: pendingPayments ?? this.pendingPayments,
    );
  }

  @override
  List<Object?> get props => [orders, pendingPayments];
}

class KasirOperationSuccess extends KasirState {
  final String message;

  const KasirOperationSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class KasirError extends KasirState {
  final String message;

  const KasirError(this.message);

  @override
  List<Object?> get props => [message];
}
