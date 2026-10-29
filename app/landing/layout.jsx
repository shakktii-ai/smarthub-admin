import Navbar from "@/components/landing/navigation";

export default function LandingLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}