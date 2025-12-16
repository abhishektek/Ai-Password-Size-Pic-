import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Crop, CheckCircle, Download, ArrowRight } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-blue-700 to-blue-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Perfect Passport Photos<br />
            <span className="text-blue-300">In Seconds</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Create biometric passport photos compliant with international standards. 
            AI-powered analysis ensures your photo gets accepted.
          </p>
          <Link 
            to="/editor" 
            className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            Start Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-16">How It Works</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              icon: Upload, 
              title: "1. Upload", 
              desc: "Take a selfie or upload an existing photo from your gallery." 
            },
            { 
              icon: Crop, 
              title: "2. Adjust", 
              desc: "Crop and zoom using our easy tool to fit standard 2x2 dimensions." 
            },
            { 
              icon: CheckCircle, 
              title: "3. Verify", 
              desc: "Our AI checks your photo for shadows, expression, and compliance." 
            },
            { 
              icon: Download, 
              title: "4. Download", 
              desc: "Get a printable 4x6 sheet or a single digital image instantly." 
            }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-slate-100 py-16 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Ready to create your photo?</h2>
          <p className="text-slate-600 mb-8">It's free, fast, and secure. No registration required.</p>
          <Link 
            to="/editor" 
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Launch Editor
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;