import { isValidObjectId } from 'mongoose';
import type { ExchangeRequest } from '@/domain/entities/exchange-request.entity';
import type {
  ExchangeRequestRepository,
  PaginatedResult,
} from '@/domain/ports/exchange-request-repository.port';
import {
  type ExchangeRequestDocument,
  ExchangeRequestModel,
} from '../models/exchange-request.model';

function toDomain(doc: ExchangeRequestDocument & { _id: { toString(): string } }): ExchangeRequest {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    amountSent: doc.amountSent,
    amountReceived: doc.amountReceived,
    rateUsed: doc.rateUsed,
    createdAt: doc.createdAt,
  };
}

export class MongoExchangeRequestRepository implements ExchangeRequestRepository {
  async save(request: Omit<ExchangeRequest, 'id' | 'createdAt'>): Promise<ExchangeRequest> {
    const doc = await ExchangeRequestModel.create(request);
    return toDomain(doc);
  }

  async findByIdAndOwner(id: string, userId: string): Promise<ExchangeRequest | null> {
    // NOTE: validar el formato de ObjectId es un detalle de Mongo
    if (!isValidObjectId(id)) return null;
    const doc = await ExchangeRequestModel.findOne({ _id: id, userId });
    return doc ? toDomain(doc) : null;
  }

  async findByOwnerPaginated(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ExchangeRequest>> {
    const [docs, total] = await Promise.all([
      ExchangeRequestModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage),
      ExchangeRequestModel.countDocuments({ userId }),
    ]);
    return { data: docs.map(toDomain), total };
  }

  async deleteByIdAndOwner(id: string, userId: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await ExchangeRequestModel.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }
}
