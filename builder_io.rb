module BuilderIO
  module Pages
    class Retrieve
      include Concerns::Caching

      def initialize(page, force: false)
        @page = page
        @force = force
      end

      def call
        # TODO: Parse as struct so response format is obvious and easy 2 handle
        JSON.parse(response.body)
      end

      cache :call, expires_in: 7.days, force: :force do
        page.origin
      end

      private

      attr_reader :page, :force

      def response 
        # TODO: SSoT 4 Builder api connection, so we could use + than /pages with no fear
        # TODO: Rescue 4 builder 404
        @response ||= Faraday.get(
          "https://cdn.builder.io/api/v3/html/page",
          params
        )
      end

      def params
        {
          apiKey: "OUR_API_KEY",
          url: page.origin
        }
      end
    end
  end
end

