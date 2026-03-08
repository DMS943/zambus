
import { ArrowRight, Star, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      {/* Background gradient */}
      <div className="absolute inset-0 african-gradient opacity-5"></div>
      
      <div className="relative max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Travel Across
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {" "}Zambia{" "}
          </span>
          with Ease
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Book your bus tickets online for comfortable journeys between major Zambian cities. 
          Skip the queues, choose your seats, and travel with confidence.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button size="lg" className="african-gradient text-lg px-8 py-3">
            Book Your Journey
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-3">
            View Routes
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 african-gradient rounded-full">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">12+</h3>
            <p className="text-gray-600">Major Cities Connected</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 african-gradient rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">50k+</h3>
            <p className="text-gray-600">Happy Passengers</p>
          </div>
          
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 african-gradient rounded-full">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">4.8★</h3>
            <p className="text-gray-600">Customer Rating</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
