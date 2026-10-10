export type ErrorClass = 'TRANSIENT' | 'AUTH_RECONNECT_REQUIRED' | 'NOT_FOUND' | 'RATE_LIMIT' | 'PERMANENT'

export class ProviderError extends Error {
  constructor(
    message: string,
    public classification: ErrorClass,
    public retryAfterMs?: number
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface CalendarEventData {
  title: string
  description: string
  location?: string
  startTime: Date
  endTime: Date
}

export interface CalendarProvider {
  /**
   * Creates an event in the external calendar.
   * Returns the external provider's event ID.
   */
  createEvent(
    connectionId: string,
    eventData: CalendarEventData
  ): Promise<string>

  /**
   * Updates an existing event in the external calendar.
   */
  updateEvent(
    connectionId: string,
    externalEventId: string,
    eventData: CalendarEventData
  ): Promise<void>

  /**
   * Deletes an event from the external calendar.
   */
  deleteEvent(
    connectionId: string,
    externalEventId: string
  ): Promise<void>

  /**
   * Checks if credentials are valid or need refresh.
   */
  refreshCredentials(connectionId: string): Promise<void>
}
