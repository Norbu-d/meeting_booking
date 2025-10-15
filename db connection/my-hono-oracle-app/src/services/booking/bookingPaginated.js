import logger from '../../utils/logger.js';
import { databaseCircuitBreaker } from '../../middleware/circuitBreaker.js';

class PaginatedBookingService {
  constructor(supabase) {
    this.supabase = supabase;
    this.defaultLimit = 50;
    this.maxLimit = 100;
  }

  async getBookings(sessionId, options = {}) {
    const {
      page = 1,
      limit = this.defaultLimit,
      status,
      roomId,
      dateFrom,
      dateTo,
      search
    } = options;

    // Validate and sanitize inputs
    const safePage = Math.max(1, parseInt(page));
    const safeLimit = Math.min(this.maxLimit, Math.max(1, parseInt(limit)));
    const offset = (safePage - 1) * safeLimit;

    try {
      // Use circuit breaker for database calls
      return await databaseCircuitBreaker.call(
        () => this.executePaginatedQuery(safePage, safeLimit, offset, {
          status, roomId, dateFrom, dateTo, search
        })
      );
    } catch (error) {
      logger.error('Paginated booking service error:', error);
      return this.handleError(error);
    }
  }

  async executePaginatedQuery(page, limit, offset, filters) {
    let query = this.supabase
      .from('meeting_bookings')
      .select(`
        id, purpose, description, date, start_time, end_time, status,
        is_multi_day, end_date, all_day, created_at, admin_remarks,
        meeting_rooms!inner(id, room_name)
      `, { count: 'exact' });

    // Apply filters
    query = this.applyFilters(query, filters);

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: {
        bookings: data || [],
        pagination: this.buildPagination(page, limit, count)
      }
    };
  }

  applyFilters(query, filters) {
    let filteredQuery = query;

    if (filters.status) {
      filteredQuery = filteredQuery.eq('status', filters.status);
    }

    if (filters.roomId) {
      filteredQuery = filteredQuery.eq('room_id', filters.roomId);
    }

    if (filters.dateFrom) {
      filteredQuery = filteredQuery.gte('date', filters.dateFrom);
    }

    if (filters.dateTo) {
      filteredQuery = filteredQuery.lte('date', filters.dateTo);
    }

    if (filters.search) {
      filteredQuery = filteredQuery.ilike('purpose', `%${filters.search}%`);
    }

    return filteredQuery;
  }

  buildPagination(page, limit, totalCount) {
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
  }

  handleError(error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      return {
        success: false,
        data: [],
        message: 'Service temporarily unavailable. Please try again shortly.'
      };
    }

    if (error.message.includes('Timeout')) {
      return {
        success: false,
        data: [],
        message: 'Request timeout. Please try a smaller page size.'
      };
    }

    return {
      success: false,
      data: [],
      message: 'Failed to fetch bookings. Please try again.'
    };
  }

  // Get available filter options
  async getFilterOptions() {
    try {
      const [statusCounts, roomCounts] = await Promise.all([
        this.supabase.from('meeting_bookings').select('status'),
        this.supabase.from('meeting_rooms').select('id, room_name')
      ]);

      return {
        statuses: this.countUnique(statusCounts.data, 'status'),
        rooms: roomCounts.data || []
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      return { statuses: [], rooms: [] };
    }
  }

  countUnique(items, field) {
    const counts = {};
    items.forEach(item => {
      counts[item[field]] = (counts[item[field]] || 0) + 1;
    });
    return counts;
  }
}

export default PaginatedBookingService;